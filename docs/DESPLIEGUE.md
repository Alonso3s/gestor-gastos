# Despliegue en Oracle Cloud

Paso a paso para publicar la app en una VM gratis de Oracle Cloud. Se hace una sola vez, toma una tarde. Después, mantenerla son unos minutos al mes.

**Resultado:** la app en `https://<tu-subdominio>.duckdns.org`, con HTTPS, respaldos diarios y actualizaciones de seguridad automáticas.

```
Internet ──HTTPS──► Caddy ──/api──► API (Node) ──► PostgreSQL
                       └──── /* ───► frontend (archivos estáticos)
```

> Los nombres de los menús de Oracle cambian de vez en cuando. Si uno no coincide, buscalo con el buscador de la consola.

## 1. Cuenta de Oracle Cloud

1. Registrate en <https://www.oracle.com/cloud/free/>. Pide tarjeta, solo para verificar identidad.
2. **Región de origen:** elegí la más cercana a Costa Rica (México o el este de EE. UU.). **No se puede cambiar después** y los recursos gratis solo existen ahí.

## 2. Pasar a Pay As You Go y crear la alerta de costo

Oracle puede reclamar una VM gratis si pasa 7 días con poco uso de CPU, red y memoria, y con 4 usuarios esta app estaría por debajo. En una cuenta _Pay As You Go_ eso no pasa, y los recursos _Always Free_ siguen sin costo.

1. **Billing & Cost Management → Upgrade and Manage Payment → Pay As You Go.** La aprobación puede tardar de unas horas a un día. Mientras tanto podés seguir con los pasos siguientes.
2. **Billing & Cost Management → Budgets → Create Budget:** monto **$1**, alerta por correo al **100 %** del presupuesto.

**Reglas para que el costo siga en $0:**

- Creá solo recursos marcados **Always Free Eligible**.
- En total, entre todas tus VMs Arm (A1): máximo **2 OCPU y 12 GB** de memoria, y máximo **200 GB** de disco.
- La primera semana, revisá **Cost Analysis**: tiene que mostrar $0.

## 3. Clave SSH (en tu PC)

En PowerShell:

```powershell
ssh-keygen -t ed25519 -C "oracle-gastos"
Get-Content $HOME\.ssh\id_ed25519.pub   # esta es la clave pública que vas a pegar en Oracle
```

## 4. Crear la VM

**Compute → Instances → Create instance:**

| Campo       | Valor                                                     |
| ----------- | --------------------------------------------------------- |
| Image       | Canonical **Ubuntu 24.04** (la variante aarch64 / Arm)    |
| Shape       | **VM.Standard.A1.Flex**, **2 OCPU**, **12 GB** de memoria |
| Networking  | Crear VCN nueva, subred pública, **asignar IP pública**   |
| SSH keys    | Pegar la clave pública del paso 3                         |
| Boot volume | 50 GB (valor por defecto)                                 |

Si aparece **"Out of capacity"**, probá otro _Availability Domain_ o reintentá más tarde. Es normal en algunas regiones.

Anotá la **IP pública** de la VM y conectate:

```powershell
ssh ubuntu@<IP-PUBLICA>
```

## 5. Abrir los puertos 80 y 443

Hay que abrirlos en **dos lugares**. Es el paso donde más gente se traba.

**5.1 En Oracle:** _Networking → Virtual Cloud Networks → (tu VCN) → Subnet → Security List → Add Ingress Rules_:

| Source CIDR | Protocolo | Puerto destino |
| ----------- | --------- | -------------- |
| `0.0.0.0/0` | TCP       | `80`           |
| `0.0.0.0/0` | TCP       | `443`          |
| `0.0.0.0/0` | UDP       | `443`          |

**5.2 En la VM.** Las imágenes Ubuntu de Oracle traen un firewall que rechaza todo. Hacé esto **antes de instalar Docker**:

```bash
sudo iptables -L INPUT --line-numbers   # buscá el número de la línea con REJECT (suele ser la 5 o la 6)
N=<numero-de-la-linea-REJECT>
sudo iptables -I INPUT $N -p tcp --dport 80 -m state --state NEW -j ACCEPT
sudo iptables -I INPUT $N -p tcp --dport 443 -m state --state NEW -j ACCEPT
sudo iptables -I INPUT $N -p udp --dport 443 -m state --state NEW -j ACCEPT
sudo netfilter-persistent save
```

## 6. Preparar el servidor

```bash
# Actualizaciones y parches de seguridad automáticos
sudo apt update && sudo apt upgrade -y
sudo apt install -y unattended-upgrades git
sudo dpkg-reconfigure -plow unattended-upgrades   # responder "Yes"

# Swap de 2 GB: evita quedarse sin memoria al compilar el frontend
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Docker (script oficial) y permiso para usarlo sin sudo
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit   # salí y volvé a entrar por SSH para que tome el grupo docker
```

Comprobá que funciona: `docker run --rm hello-world`.

## 7. Dominio gratis en DuckDNS

1. Entrá a <https://www.duckdns.org> con tu cuenta de GitHub o Google.
2. Creá un subdominio, por ejemplo `gastos-alonso`, y en **current ip** poné la IP pública de la VM.
3. Comprobalo desde tu PC: `nslookup gastos-alonso.duckdns.org`. Tiene que devolver la IP de la VM.

## 8. Descargar el código en la VM

El repositorio es privado, así que la VM necesita una llave de solo lectura (_deploy key_):

```bash
ssh-keygen -t ed25519 -C "vm-gastos" -f ~/.ssh/github_gastos -N ""
cat ~/.ssh/github_gastos.pub
```

En GitHub: **repo → Settings → Deploy keys → Add deploy key**. Pegá la clave y **no** marques "Allow write access". Luego, en la VM:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/github_gastos
EOF
git clone -b desarrollo git@github.com:Alonso3s/gestor-gastos.git
cd gestor-gastos
```

## 9. Configurar y levantar

```bash
cp deploy/.env.prod.example deploy/.env
openssl rand -hex 24      # copiá el resultado en POSTGRES_PASSWORD
openssl rand -base64 48   # copiá el resultado en JWT_ACCESS_SECRET
nano deploy/.env          # completá DOMAIN, POSTGRES_PASSWORD y JWT_ACCESS_SECRET
```

```bash
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

El primer build tarda varios minutos. Las siguientes veces es más rápido.

## 10. Verificar

```bash
docker compose -f deploy/docker-compose.prod.yml ps
```

`db` y `api` deben decir **healthy**, `web` **Up** y `migrate` **Exited (0)**. Después:

```bash
curl https://<tu-dominio>/api/health   # {"status":"ok"}
```

Abrí `https://<tu-dominio>` en el navegador, registrate, creá una transacción, recargá la página y revisá el reporte.

## 11. Respaldos diarios

```bash
crontab -e
```

Agregá esta línea (respaldo todos los días a las 3:00 a. m., con 14 días de historial):

```cron
0 3 * * * /home/ubuntu/gestor-gastos/deploy/backup.sh >> /home/ubuntu/backups/backup.log 2>&1
```

Probalo una vez a mano: `deploy/backup.sh && ls ~/backups`.

Un respaldo que vive solo en la VM se pierde con la VM. De vez en cuando copiá uno a tu PC:

```powershell
scp ubuntu@<IP-PUBLICA>:~/backups/gastos-AAAA-MM-DD.dump .
```

**Restaurar un respaldo** (reemplaza los datos actuales):

```bash
docker compose -f deploy/docker-compose.prod.yml exec -T db \
  pg_restore -U gastos -d gastos --clean --if-exists < ~/backups/gastos-AAAA-MM-DD.dump
```

## 12. Publicar una versión nueva

```bash
cd ~/gestor-gastos
git pull
docker compose -f deploy/docker-compose.prod.yml up -d --build
docker image prune -f   # borra imágenes viejas para no llenar el disco
```

Las migraciones de base de datos se aplican solas antes de que arranque la API.

## 13. Problemas comunes

| Síntoma                                          | Causa probable y solución                                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| La web no carga                                  | Faltan puertos (paso 5) o el DNS no apunta a la VM (paso 7).                                                                 |
| Error de certificado / Caddy no obtiene el HTTPS | El puerto 80 está cerrado o el dominio no resuelve a la VM. Ver `docker compose -f deploy/docker-compose.prod.yml logs web`. |
| `api` reinicia una y otra vez                    | Casi siempre una variable inválida en `deploy/.env`. Ver `docker compose -f deploy/docker-compose.prod.yml logs api`.        |
| `migrate` termina con error                      | Ver sus logs. Si la base no responde, revisar `logs db`.                                                                     |
| La sesión se pierde al recargar                  | Se está entrando por IP en lugar del dominio. Usar siempre `https://<tu-dominio>`.                                           |
| Cambió la IP pública de la VM                    | Actualizarla en DuckDNS.                                                                                                     |
| Llegó un correo de la alerta de $1               | Revisar _Cost Analysis_ y borrar el recurso que no sea _Always Free_.                                                        |

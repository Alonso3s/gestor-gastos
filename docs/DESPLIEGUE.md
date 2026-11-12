# Manual de despliegue en Oracle Cloud

Paso a paso para publicar el Gestor de Gastos en internet, gratis, en una VM de Oracle Cloud. Está pensado para alguien que usa la terminal pero nunca administró un servidor. Reservá unas dos horas la primera vez (sin contar la espera de aprobación de la cuenta).

Al terminar vas a tener:

```
Internet ──HTTPS──► Caddy (:80/:443)
                     ├── /api/*  ──► api (Node, :3000) ──► db (PostgreSQL 16, red interna)
                     └── /*      ──► frontend (archivos estáticos)
```

- Una sola VM con Docker Compose y cuatro contenedores: `db`, `migrate` (corre una vez y termina), `api` y `web`.
- Un solo dominio para la web y la API. Es obligatorio: la cookie de sesión no viaja entre dominios distintos.
- Certificado HTTPS automático: Caddy lo pide y lo renueva solo.

En los comandos, reemplazá lo que está entre `<…>` por tu valor. Salvo que se indique lo contrario, todo se ejecuta **en la VM**, conectado por SSH.

## Índice

1. [Cuenta de Oracle Cloud](#1-cuenta-de-oracle-cloud)
2. [Pasar la cuenta a Pay As You Go](#2-pasar-la-cuenta-a-pay-as-you-go)
3. [Crear la VM](#3-crear-la-vm)
4. [Abrir los puertos 80 y 443](#4-abrir-los-puertos-80-y-443)
5. [Preparar el servidor](#5-preparar-el-servidor)
6. [Dominio en DuckDNS](#6-dominio-en-duckdns)
7. [Primer despliegue](#7-primer-despliegue)
8. [Verificar](#8-verificar)
9. [Respaldos](#9-respaldos)
10. [Actualizar la app](#10-actualizar-la-app)
11. [Problemas comunes](#11-problemas-comunes)

## 1. Cuenta de Oracle Cloud

1. Entrá a https://www.oracle.com/cloud/free/ y creá una cuenta.
2. Oracle pide una tarjeta. Es solo para verificar tu identidad: hace una retención temporal pequeña y la devuelve.
3. **Elegí con cuidado la región de origen (_Home Region_).** No se puede cambiar después, y los recursos gratuitos solo existen en esa región. Elegí la más cercana a Costa Rica que te ofrezca el formulario (por ejemplo, una de Estados Unidos o de México).

## 2. Pasar la cuenta a Pay As You Go

Las cuentas gratuitas tienen un riesgo: Oracle puede **reclamar (apagar) una VM Always Free** si durante 7 días tiene a la vez menos del 20 % de uso de CPU (percentil 95), de red y de memoria. Con 4 usuarios, esta app queda por debajo en las tres medidas.

En una cuenta _Pay As You Go_ las VMs no se reclaman por inactividad, y los recursos Always Free **siguen siendo gratis**. Por eso el primer paso es pasar la cuenta a ese modo.

1. En la consola de Oracle, abrí el menú (☰) → **Billing & Cost Management** → **Upgrade and Manage Payment**.
2. Elegí **Pay As You Go** y confirmá la tarjeta. La aprobación puede tardar desde unas horas hasta un día; mientras tanto podés seguir con el paso 3.
3. **En ese mismo momento, creá un presupuesto con alerta** para enterarte si algo llegara a cobrarse:
   1. Menú → **Billing & Cost Management** → **Budgets** → **Create Budget**.
   2. Monto mensual: **1 USD**.
   3. Agregá una regla de alerta al **100 %** del gasto real, con tu correo como destinatario.

### Reglas para que el costo siga en $0

- Creá **solo** recursos marcados como **Always Free Eligible**.
- En el shape Arm (A1), no pases de **2 OCPU y 12 GB de RAM en total** entre todas tus VMs.
- No pases de **200 GB de disco** en total (esta guía usa 50 GB).
- La primera semana, revisá **Billing & Cost Management → Cost Analysis** un par de veces: debe marcar 0.
- **No uses scripts que generan carga falsa** para "mantener viva" la VM. Con Pay As You Go no hacen falta, y van contra las condiciones de uso.

## 3. Crear la VM

Primero necesitás una clave SSH. Si no tenés una, creala **en tu computadora**:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/oracle_gastos
```

Eso genera dos archivos: `oracle_gastos` (privada, no la compartas) y `oracle_gastos.pub` (pública, la que se sube a Oracle).

Ahora, en la consola de Oracle:

1. Menú → **Compute** → **Instances** → **Create instance**.
2. **Image and shape** → **Edit**:
   - **Image**: Canonical Ubuntu **24.04** (la variante **aarch64**; aparece al elegir un shape Ampere).
   - **Shape**: **Ampere** → `VM.Standard.A1.Flex`, con **2 OCPU** y **12 GB** de memoria (el máximo gratis).
3. **Networking**: dejá que cree una VCN nueva y verificá que esté marcado **Assign a public IPv4 address**.
4. **Add SSH keys**: elegí **Paste public keys** y pegá el contenido de `oracle_gastos.pub`.
5. **Boot volume**: tamaño personalizado de **50 GB**.
6. **Create**.

Si aparece **"Out of capacity"**, no es un error tuyo: no hay máquinas Arm libres en ese momento. Probá con otro _Availability Domain_ (si tu región tiene más de uno) o reintentá más tarde; suele liberarse en horas.

Cuando la instancia esté en estado **Running**, copiá su **Public IP address** y conectate desde tu computadora:

```bash
ssh -i ~/.ssh/oracle_gastos ubuntu@<IP_PUBLICA>
```

## 4. Abrir los puertos 80 y 443

Hay que abrirlos **en dos lugares**. Es el paso donde más gente se traba: si abrís solo uno, la web no carga.

### 4.1. En la red de Oracle (Security List)

1. En la página de la instancia, entrá a la **Subnet** y luego a su **Default Security List**.
2. **Add Ingress Rules**, y agregá dos reglas:

   | Source CIDR | IP Protocol | Destination Port Range |
   | ----------- | ----------- | ---------------------- |
   | `0.0.0.0/0` | TCP         | `80`                   |
   | `0.0.0.0/0` | TCP         | `443`                  |

   Opcional: una tercera regla **UDP 443** habilita HTTP/3. La app funciona igual sin ella.

### 4.2. En el firewall de la VM (iptables)

Las imágenes Ubuntu de Oracle traen reglas `iptables` que rechazan todo salvo SSH. Las reglas nuevas tienen que quedar **antes** de la regla `REJECT`; si quedan después, no tienen efecto.

Buscá en qué línea está el `REJECT` e insertá las reglas en esa posición:

```bash
LINEA=$(sudo iptables -L INPUT --line-numbers | awk '/REJECT/ {print $1; exit}')
sudo iptables -I INPUT "$LINEA" -p tcp -m state --state NEW -m multiport --dports 80,443 -j ACCEPT
```

Guardalas para que sobrevivan a un reinicio:

```bash
sudo netfilter-persistent save
```

Verificá que la regla nueva aparezca **arriba** del `REJECT`:

```bash
sudo iptables -L INPUT --line-numbers
```

## 5. Preparar el servidor

### 5.1. Actualizar paquetes

```bash
sudo apt update && sudo apt upgrade -y
```

### 5.2. Actualizaciones de seguridad automáticas

```bash
sudo apt install -y unattended-upgrades
```

```bash
sudo dpkg-reconfigure -plow unattended-upgrades
```

Respondé **Yes** cuando pregunte.

### 5.3. Instalar Docker y Compose

Se instala desde el repositorio oficial de Docker (el de Ubuntu suele traer versiones viejas):

```bash
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Agregá tu usuario al grupo `docker` para no tener que usar `sudo`:

```bash
sudo usermod -aG docker ubuntu
```

**Cerrá la sesión SSH y volvé a entrar** para que el cambio tome efecto. Después comprobá:

```bash
docker run --rm hello-world
```

### 5.4. Agregar 2 GB de swap

Sin swap, la compilación del frontend puede quedarse sin memoria.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Comprobá con `free -h`: la fila **Swap** debe mostrar 2,0Gi.

## 6. Dominio en DuckDNS

1. Entrá a https://www.duckdns.org e iniciá sesión (con GitHub o Google).
2. En **sub domain**, escribí un nombre (por ejemplo `gastos-alonso`) y tocá **add domain**.
3. En el campo **current ip** de ese dominio, poné la **IP pública de la VM** y tocá **update ip**.

Comprobá desde tu computadora que el dominio ya apunta a la VM (puede tardar un par de minutos):

```bash
nslookup <nombre>.duckdns.org
```

La respuesta debe mostrar la IP pública de la VM.

## 7. Primer despliegue

1. Cloná el repositorio en la VM:

   ```bash
   cd ~
   git clone https://github.com/Alonso3s/gestor-gastos.git
   cd gestor-gastos
   ```

   Si el repositorio es privado, GitHub pide usuario y un _personal access token_ como contraseña. Si los cambios de despliegue todavía no se integraron a `main`, cambiá de rama con `git checkout desarrollo`.

2. Creá el archivo de configuración:

   ```bash
   cp deploy/.env.prod.example deploy/.env
   ```

3. Generá el secreto para firmar los tokens y copiá el resultado:

   ```bash
   openssl rand -base64 48
   ```

4. Editá el archivo:

   ```bash
   nano deploy/.env
   ```

   | Variable            | Qué poner                                                             |
   | ------------------- | --------------------------------------------------------------------- |
   | `DOMAIN`            | Tu dominio, sin `https://`. Ejemplo: `gastos-alonso.duckdns.org`      |
   | `POSTGRES_PASSWORD` | Una contraseña larga, **solo letras y números**                       |
   | `DATABASE_URL`      | La misma contraseña en lugar de `cambia-esto`. No cambies el resto    |
   | `CORS_ORIGIN`       | `https://` + tu dominio. Ejemplo: `https://gastos-alonso.duckdns.org` |
   | `JWT_ACCESS_SECRET` | El valor que generaste en el paso 3                                   |

   El resto se deja como está. En `nano`, guardá con `Ctrl+O`, `Enter`, y salí con `Ctrl+X`.

   Este archivo tiene secretos: no lo subas a git (ya está en `.gitignore`) ni lo compartas.

5. Construí y levantá todo:

   ```bash
   docker compose -f deploy/docker-compose.prod.yml up -d --build
   ```

   La primera vez tarda entre 5 y 10 minutos: descarga las imágenes base y compila la API y el frontend. Al arrancar, el servicio `migrate` crea las tablas y Caddy pide el certificado HTTPS.

En producción **no se corre el seed**: crearía un usuario demo con una contraseña conocida.

## 8. Verificar

1. Estado de los contenedores:

   ```bash
   docker compose -f deploy/docker-compose.prod.yml ps -a
   ```

   Debe mostrar `db` y `api` como `healthy`, `web` como `Up` y `migrate` como `Exited (0)` (es normal: corre una vez y termina).

2. La API responde por HTTPS:

   ```bash
   curl https://<dominio>/api/health
   ```

   Debe responder `{"status":"ok"}`.

3. Abrí `https://<dominio>` en el navegador, registrate, creá una transacción y recargá la página: la sesión debe mantenerse.

Entrá siempre por el dominio, no por la IP: por IP no hay certificado válido y la sesión no se conserva.

## 9. Respaldos

El script `deploy/backup.sh` guarda una copia de la base en `~/backups/gastos-AAAA-MM-DD.dump` y borra las de más de 14 días.

1. Probalo a mano:

   ```bash
   ~/gestor-gastos/deploy/backup.sh
   ```

   Debe terminar con `Respaldo creado: …`. (El archivo ya viene con permiso de ejecución; si no, corré `chmod +x ~/gestor-gastos/deploy/backup.sh`.)

2. Programalo todos los días a las 3:00 a. m.:

   ```bash
   crontab -e
   ```

   Agregá esta línea al final y guardá:

   ```
   0 3 * * * /home/ubuntu/gestor-gastos/deploy/backup.sh >> /home/ubuntu/backups/backup.log 2>&1
   ```

3. **Copiá un respaldo fuera de la VM de vez en cuando.** Si se pierde la VM, se pierden también los respaldos que están en ella. Desde tu computadora:

   ```bash
   scp -i ~/.ssh/oracle_gastos ubuntu@<IP_PUBLICA>:backups/gastos-<fecha>.dump .
   ```

### Restaurar un respaldo

Esto **reemplaza** los datos actuales por los del respaldo. Hacelo desde `~/gestor-gastos`.

1. Detené la API para que nadie escriba durante la restauración:

   ```bash
   docker compose -f deploy/docker-compose.prod.yml stop api
   ```

2. Restaurá (cambiá la fecha por la del archivo que quieras):

   ```bash
   docker compose -f deploy/docker-compose.prod.yml exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < ~/backups/gastos-<fecha>.dump
   ```

3. Volvé a levantar la API:

   ```bash
   docker compose -f deploy/docker-compose.prod.yml start api
   ```

Probá una restauración al menos una vez, antes de necesitarla de verdad.

## 10. Actualizar la app

Cuando haya cambios nuevos en el repositorio:

```bash
cd ~/gestor-gastos
git pull
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

Las migraciones de base de datos se aplican solas al arrancar. Después, liberá espacio borrando las imágenes viejas:

```bash
docker image prune -f
```

Es buena idea correr `deploy/backup.sh` antes de actualizar.

## 11. Problemas comunes

Para ver los logs de un servicio (`web`, `api`, `db` o `migrate`):

```bash
docker compose -f deploy/docker-compose.prod.yml logs --tail 100 <servicio>
```

| Síntoma                                            | Causa probable y qué revisar                                                                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La web no carga (el navegador se queda esperando)  | Puertos o DNS. Revisá las **dos** partes del [paso 4](#4-abrir-los-puertos-80-y-443) y que `nslookup <dominio>` devuelva la IP de la VM.                                              |
| Aviso de certificado inválido; Caddy no lo obtiene | El puerto 80 está cerrado o el DNS no apunta a la VM. Let's Encrypt necesita llegar al puerto 80 para validar el dominio. Mirá `logs web`. Tras corregirlo, Caddy reintenta solo.     |
| `api` reinicia una y otra vez                      | Casi siempre una variable inválida en `deploy/.env`. `logs api` dice cuál (por ejemplo, `JWT_ACCESS_SECRET` de menos de 16 caracteres o `CORS_ORIGIN` sin `https://`).                |
| `migrate` termina con error                        | `DATABASE_URL` no coincide con `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`. Ojo: si cambiás la contraseña después del primer arranque, la base ya quedó creada con la anterior. |
| La sesión se pierde al recargar                    | Se está entrando por IP o por `http://` y no por `https://<dominio>`. También pasa si `CORS_ORIGIN` no es exactamente `https://<dominio>`.                                            |
| Error al iniciar sesión o registrarse              | `CORS_ORIGIN` o `DOMAIN` mal escritos. Corregí `deploy/.env` y aplicá los cambios con el comando de abajo.                                                                            |
| El build se corta o la VM se queda sin memoria     | Falta el swap del [paso 5.4](#54-agregar-2-gb-de-swap).                                                                                                                               |
| "No space left on device"                          | Imágenes viejas acumuladas: `docker image prune -f` y, si hace falta, `docker builder prune -f`.                                                                                      |

Después de cambiar `deploy/.env`, aplicá los cambios con:

```bash
docker compose -f deploy/docker-compose.prod.yml up -d
```

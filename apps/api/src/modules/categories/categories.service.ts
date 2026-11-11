import type { Category } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { isUniqueConstraintError } from '../../lib/prismaErrors.js';
import type {
  CategoryDto,
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from './categories.schemas.js';

function toCategoryDto(category: Category): CategoryDto {
  return { id: category.id, name: category.name, type: category.type, color: category.color };
}

function duplicatedNameError(): AppError {
  return new AppError('CONFLICT', 'Ya tenés una categoría de ese tipo con el mismo nombre');
}

/** Busca una categoría del usuario; responde 404 también si existe pero es de otro usuario. */
export async function findOwnedCategory(userId: string, id: string): Promise<Category> {
  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) throw new AppError('NOT_FOUND', 'Categoría no encontrada');
  return category;
}

/** Lista las categorías del usuario, opcionalmente filtradas por tipo. */
export async function listCategories(
  userId: string,
  query: ListCategoriesQuery,
): Promise<CategoryDto[]> {
  const categories = await prisma.category.findMany({
    where: { userId, type: query.type },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });
  return categories.map(toCategoryDto);
}

/** Crea una categoría. Falla con CONFLICT si el usuario ya tiene otra con igual nombre y tipo. */
export async function createCategory(
  userId: string,
  input: CreateCategoryInput,
): Promise<CategoryDto> {
  try {
    const category = await prisma.category.create({ data: { ...input, userId } });
    return toCategoryDto(category);
  } catch (error) {
    if (isUniqueConstraintError(error)) throw duplicatedNameError();
    throw error;
  }
}

/** Edita nombre y/o color de una categoría del usuario. */
export async function updateCategory(
  userId: string,
  id: string,
  input: UpdateCategoryInput,
): Promise<CategoryDto> {
  await findOwnedCategory(userId, id);
  try {
    const category = await prisma.category.update({ where: { id }, data: input });
    return toCategoryDto(category);
  } catch (error) {
    if (isUniqueConstraintError(error)) throw duplicatedNameError();
    throw error;
  }
}

/** Borra una categoría del usuario. Falla con CONFLICT si tiene transacciones. */
export async function deleteCategory(userId: string, id: string): Promise<void> {
  await findOwnedCategory(userId, id);

  const transactionCount = await prisma.transaction.count({ where: { categoryId: id } });
  if (transactionCount > 0) {
    throw new AppError(
      'CONFLICT',
      'No se puede borrar una categoría con transacciones. Reasignalas o borralas primero',
    );
  }
  await prisma.category.delete({ where: { id } });
}

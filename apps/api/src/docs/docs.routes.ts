import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from './openapi.js';

export const docsRouter = Router();

const openApiDocument = buildOpenApiDocument();

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});
docsRouter.use('/', swaggerUi.serve, swaggerUi.setup(openApiDocument));

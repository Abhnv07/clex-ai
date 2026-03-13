import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../utils/swagger';

const router = Router();

// Custom CSS for Swagger UI
const customCss = `
.swagger-ui .topbar { display: none }
.swagger-ui .info { margin: 20px 0 }
.swagger-ui .scheme-container { margin: 20px 0 }
.swagger-ui .opblock.opblock-post { border-color: #49cc90 }
.swagger-ui .opblock.opblock-get { border-color: #61affe }
.swagger-ui .opblock.opblock-delete { border-color: #f93e3e }
`;

const customOptions = {
  customCss,
  customSiteTitle: 'CLEX API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
  },
};

// Swagger JSON specification
router.get('/json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpec, customOptions));

export default router;

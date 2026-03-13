import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '../config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CLEX API',
      version: '1.0.0',
      description: 'AI model aggregation service with multiple provider support',
      contact: {
        name: 'CLEX Support',
        url: 'https://clex.in/support',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: config.NODE_ENV === 'production' ? 'https://api.clex.in' : `http://localhost:${config.PORT}`,
        description: config.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'API key authentication. Use format: "Bearer clex_xxx"',
        },
        FirebaseAuth: {
          type: 'apiKey',
          in: 'header', 
          name: 'Authorization',
          description: 'Firebase ID token authentication. Use format: "Bearer <firebase-id-token>"',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Human-readable error message',
                },
                type: {
                  type: 'string',
                  description: 'Machine-readable error type',
                },
                code: {
                  type: 'string',
                  description: 'Error code for programmatic handling',
                },
                status: {
                  type: 'integer',
                  description: 'HTTP status code',
                },
              },
              required: ['message', 'type', 'code', 'status'],
            },
          },
        },
        ChatMessage: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              enum: ['system', 'user', 'assistant'],
              description: 'Role of the message sender',
            },
            content: {
              type: 'string',
              description: 'Content of the message',
            },
          },
          required: ['role', 'content'],
        },
        ChatCompletionRequest: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Model ID to use for completion',
              examples: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-1.5-pro'],
            },
            messages: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ChatMessage',
              },
              description: 'Array of messages in the conversation',
            },
            temperature: {
              type: 'number',
              minimum: 0,
              maximum: 2,
              default: 1,
              description: 'Controls randomness in the output',
            },
            max_tokens: {
              type: 'integer',
              minimum: 1,
              maximum: 8192,
              description: 'Maximum number of tokens to generate',
            },
            top_p: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              default: 1,
              description: 'Nucleus sampling parameter',
            },
            stream: {
              type: 'boolean',
              default: false,
              description: 'Whether to stream the response',
            },
          },
          required: ['model', 'messages'],
        },
        ChatCompletionResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the completion',
            },
            object: {
              type: 'string',
              enum: ['chat.completion'],
              description: 'Object type',
            },
            created: {
              type: 'integer',
              description: 'Unix timestamp of creation',
            },
            model: {
              type: 'string',
              description: 'Model used for completion',
            },
            choices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  index: {
                    type: 'integer',
                    description: 'Choice index',
                  },
                  message: {
                    type: 'object',
                    properties: {
                      role: {
                        type: 'string',
                        enum: ['assistant'],
                      },
                      content: {
                        type: 'string',
                        description: 'Generated content',
                      },
                    },
                  },
                  finish_reason: {
                    type: 'string',
                    description: 'Reason for completion termination',
                  },
                },
              },
            },
            usage: {
              type: 'object',
              properties: {
                prompt_tokens: {
                  type: 'integer',
                  description: 'Number of prompt tokens used',
                },
                completion_tokens: {
                  type: 'integer',
                  description: 'Number of completion tokens generated',
                },
                total_tokens: {
                  type: 'integer',
                  description: 'Total number of tokens used',
                },
              },
            },
          },
        },
        ApiKey: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique API key identifier' },
            name: { type: 'string', description: 'Human-readable name for the API key' },
            prefix: { type: 'string', description: 'First 12 characters of the API key (masked display)' },
            project_id: { type: 'string', nullable: true, description: 'Associated project ID' },
            created_at: { type: 'string', format: 'date-time' },
            last_used: { type: 'string', format: 'date-time', nullable: true },
            revoked_at: { type: 'string', format: 'date-time', nullable: true },
            expires_at: { type: 'string', format: 'date-time', nullable: true },
            limits: {
              type: 'object',
              properties: {
                max_requests_per_minute: { type: 'integer', nullable: true },
                max_requests_per_day: { type: 'integer', nullable: true },
                max_tokens_per_day: { type: 'integer', nullable: true },
              },
            },
            status: { type: 'string', enum: ['active', 'revoked', 'expired'] },
          },
        },
        ApiKeyCreateRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 64, default: 'Default Key' },
            expiresAt: { type: 'string', format: 'date-time', description: 'Optional expiration date' },
            projectId: { type: 'string', format: 'uuid', description: 'Optional project to attach this key to' },
            maxRequestsPerMinute: { type: 'integer', description: 'Per-key requests/minute limit override' },
            maxRequestsPerDay: { type: 'integer', description: 'Per-key requests/day limit override' },
            maxTokensPerDay: { type: 'integer', description: 'Per-key tokens/day limit override' },
          },
        },
        ApiKeyCreated: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            key: { type: 'string', description: 'Full API key – shown only once on creation' },
            name: { type: 'string' },
            prefix: { type: 'string' },
            project_id: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            expires_at: { type: 'string', format: 'date-time', nullable: true },
            limits: { type: 'object' },
            warning: { type: 'string' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            archived_at: { type: 'string', format: 'date-time', nullable: true },
            active_keys: { type: 'integer' },
            total_requests: { type: 'integer' },
          },
        },
        KeyEvent: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            action: { type: 'string', enum: ['created', 'revoked', 'rotated', 'updated'] },
            details: { type: 'string', nullable: true },
            ip: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        UsageLog: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            request_id: { type: 'string' },
            model: { type: 'string' },
            provider: { type: 'string' },
            prompt_tokens: { type: 'integer' },
            completion_tokens: { type: 'integer' },
            total_tokens: { type: 'integer' },
            estimated_cost: { type: 'number' },
            status: { type: 'integer' },
            duration_ms: { type: 'integer' },
            error_message: { type: 'string', nullable: true },
            streaming: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            pages: { type: 'integer' },
          },
        },
        Model: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Model identifier',
            },
            object: {
              type: 'string',
              enum: ['model'],
              description: 'Object type',
            },
            created: {
              type: 'integer',
              description: 'Unix timestamp of model creation',
            },
            owned_by: {
              type: 'string',
              description: 'Provider that owns the model',
            },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ok', 'degraded', 'unhealthy'],
              description: 'Overall health status',
            },
            version: {
              type: 'string',
              description: 'API version',
            },
            service: {
              type: 'string',
              description: 'Service name',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'When the health check was performed',
            },
            uptime: {
              type: 'number',
              description: 'Service uptime in seconds',
            },
            memory: {
              type: 'object',
              properties: {
                used: {
                  type: 'number',
                  description: 'Memory used in bytes',
                },
                total: {
                  type: 'number',
                  description: 'Total memory in bytes',
                },
                percentage: {
                  type: 'number',
                  description: 'Memory usage percentage',
                },
              },
            },
            checks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Check name',
                  },
                  status: {
                    type: 'string',
                    enum: ['healthy', 'unhealthy', 'degraded'],
                    description: 'Check status',
                  },
                  responseTime: {
                    type: 'number',
                    description: 'Response time in milliseconds',
                  },
                  error: {
                    type: 'string',
                    description: 'Error message if check failed',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [
    './src/routes/*.ts',
    './src/index.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

import swaggerJsdoc from 'swagger-jsdoc';

/** @type {import('swagger-jsdoc').Options} */
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'MARVI API',
            version: '1.0.0',
            description: 'Documentación del API REST de la Lavandería MARVI',
        },
        tags: [
            {name: 'Estado', description: 'Estado del servidor'},
            {name: 'Usuarios', description: 'Gestión de usuarios'},
            {name: 'Clientes', description: 'Gestión de clientes'},
            {name: 'Proveedores', description: 'Gestión de proveedores'},
            {name: 'Productos', description: 'Gestión de productos'},
            {name: 'Servicios', description: 'Gestión de servicios'},
            {name: 'Compras', description: 'Gestión de compras'},
            {name: 'Pedidos', description: 'Gestión de pedidos'},
        ],
        servers: [
            {
                url: 'https://marvi-api.onrender.com',
                description: 'Servidor de en render',
            },
            {
                url: 'http://localhost:2026',
                description: 'Servidor de desarrollo',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    required: ['usuario', 'nombre', 'correo'],
                    properties: {
                        _id: {type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d1'},
                        usuario: {type: 'string', example: 'jperez'},
                        nombre: {type: 'string', example: 'Juan'},
                        primer_apellido: {type: 'string', nullable: true, example: 'Pérez'},
                        segundo_apellido: {type: 'string', nullable: true, example: 'García'},
                        correo: {type: 'string', format: 'email', example: 'juan@example.com'},
                        contrasena: {type: 'string', nullable: true, example: 'hashedpassword'},
                        rol: {type: 'string', enum: ['administrador', 'usuario', 'invitado'], example: 'usuario'},
                        estado: {type: 'string', enum: ['activo', 'inactivo'], example: 'activo'},
                        imagen_perfil: {type: 'string', nullable: true, example: 'https://example.com/foto.jpg'},
                        fecha_registro: {type: 'string', format: 'date-time', example: '2026-01-15T10:30:00Z'},
                        createdAt: {type: 'string', format: 'date-time'},
                        updatedAt: {type: 'string', format: 'date-time'},
                    },
                },
                Client: {
                    type: 'object',
                    required: ['codigo', 'nombre'],
                    properties: {
                        _id: {type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d3'},
                        codigo: {type: 'string', example: 'CLI-001'},
                        nombre: {type: 'string', example: 'María'},
                        primer_apellido: {type: 'string', nullable: true, example: 'García'},
                        segundo_apellido: {type: 'string', nullable: true, example: 'López'},
                        correo: {type: 'string', format: 'email', nullable: true, example: 'maria@example.com'},
                        contrasena: {type: 'string', nullable: true, example: 'hashedpassword'},
                        telefono: {type: 'string', nullable: true, example: '+51 987654321'},
                        direccion: {type: 'string', nullable: true, example: 'Av. Principal 123'},
                        estado: {type: 'string', enum: ['activo', 'inactivo'], example: 'activo'},
                        imagen_perfil: {type: 'string', nullable: true, example: 'https://example.com/foto.jpg'},
                        fecha_registro: {type: 'string', format: 'date-time', example: '2026-01-15T10:30:00Z'},
                        createdAt: {type: 'string', format: 'date-time'},
                        updatedAt: {type: 'string', format: 'date-time'},
                    },
                },
                Supplier: {
                    type: 'object',
                    required: ['codigo', 'nombre'],
                    properties: {
                        _id: {type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d5'},
                        codigo: {type: 'string', example: 'PROV-001'},
                        nombre: {type: 'string', example: 'Distribuidora SA'},
                        correo: {type: 'string', format: 'email', nullable: true, example: 'proveedor@example.com'},
                        telefono: {type: 'string', nullable: true, example: '+51 912345678'},
                        direccion: {type: 'string', nullable: true, example: 'Calle Comercial 456'},
                        estado: {type: 'string', enum: ['activo', 'inactivo'], example: 'activo'},
                        fecha_registro: {type: 'string', format: 'date-time', example: '2026-01-15T10:30:00Z'},
                        createdAt: {type: 'string', format: 'date-time'},
                        updatedAt: {type: 'string', format: 'date-time'},
                    },
                },
                Product: {
                    type: 'object',
                    required: ['codigo', 'nombre', 'unidad_medida', 'precio'],
                    properties: {
                        _id: {type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d2'},
                        codigo: {type: 'string', example: 'PROD-001'},
                        nombre: {type: 'string', example: 'Detergente'},
                        descripcion: {type: 'string', nullable: true, example: 'Detergente líquido para ropa'},
                        unidad_medida: {type: 'string', example: 'KG'},
                        precio: {type: 'number', minimum: 0, example: 15.5},
                        stock: {type: 'number', minimum: 0, example: 100},
                        estado: {type: 'string', enum: ['activo', 'inactivo'], example: 'activo'},
                        imagen: {type: 'string', nullable: true, example: 'https://example.com/imagen.jpg'},
                        fecha_registro: {type: 'string', format: 'date-time', example: '2026-01-15T10:30:00Z'},
                        createdAt: {type: 'string', format: 'date-time'},
                        updatedAt: {type: 'string', format: 'date-time'},
                    },
                },
                Service: {
                    type: 'object',
                    required: ['codigo', 'nombre', 'unidad_medida', 'precio'],
                    properties: {
                        _id: {type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d7'},
                        codigo: {type: 'string', example: 'SERV-001'},
                        nombre: {type: 'string', example: 'Lavado Express'},
                        descripcion: {type: 'string', nullable: true, example: 'Lavado rápido en 1 hora'},
                        unidad_medida: {type: 'string', example: 'KG'},
                        precio: {type: 'number', minimum: 0, example: 25.0},
                        estado: {type: 'string', enum: ['activo', 'inactivo'], example: 'activo'},
                        imagen: {type: 'string', nullable: true, example: 'https://example.com/imagen.jpg'},
                        fecha_registro: {type: 'string', format: 'date-time', example: '2026-01-15T10:30:00Z'},
                        createdAt: {type: 'string', format: 'date-time'},
                        updatedAt: {type: 'string', format: 'date-time'},
                    },
                },
                PurchaseItem: {
                    type: 'object',
                    required: ['producto_id', 'codigo', 'nombre', 'cantidad', 'precio_unitario', 'subtotal'],
                    properties: {
                        producto_id: {type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d2'},
                        codigo: {type: 'string', example: 'PROD-001'},
                        nombre: {type: 'string', example: 'Detergente'},
                        cantidad: {type: 'number', minimum: 1, example: 10},
                        precio_unitario: {type: 'number', minimum: 0, example: 12.0},
                        subtotal: {type: 'number', minimum: 0, example: 120.0},
                    },
                },
                Purchase: {
                    type: 'object',
                    required: ['codigo', 'proveedor_id'],
                    properties: {
                        _id: {type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d6'},
                        codigo: {type: 'string', example: 'COMP-001'},
                        proveedor_id: {type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d5'},
                        productos: {
                            type: 'array',
                            items: {$ref: '#/components/schemas/PurchaseItem'},
                            default: [],
                        },
                        total: {type: 'number', minimum: 0, example: 500.0},
                        fecha_registro: {type: 'string', format: 'date-time', example: '2026-01-15T10:30:00Z'},
                        createdAt: {type: 'string', format: 'date-time'},
                        updatedAt: {type: 'string', format: 'date-time'},
                    },
                },
                OrderItemProduct: {
                    type: 'object',
                    required: ['producto_id', 'codigo', 'nombre', 'cantidad', 'precio_unitario', 'subtotal'],
                    properties: {
                        producto_id: {type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d2'},
                        codigo: {type: 'string', example: 'PROD-001'},
                        nombre: {type: 'string', example: 'Detergente'},
                        cantidad: {type: 'number', minimum: 1, example: 2},
                        precio_unitario: {type: 'number', minimum: 0, example: 15.5},
                        subtotal: {type: 'number', minimum: 0, example: 31.0},
                    },
                },
                OrderItemService: {
                    type: 'object',
                    required: ['servicio_id', 'codigo', 'nombre', 'cantidad', 'precio_unitario', 'subtotal'],
                    properties: {
                        servicio_id: {type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d7'},
                        codigo: {type: 'string', example: 'SERV-001'},
                        nombre: {type: 'string', example: 'Lavado Express'},
                        cantidad: {type: 'number', minimum: 1, example: 1},
                        precio_unitario: {type: 'number', minimum: 0, example: 25.0},
                        subtotal: {type: 'number', minimum: 0, example: 25.0},
                    },
                },
                Order: {
                    type: 'object',
                    required: ['codigo', 'cliente_id'],
                    properties: {
                        _id: {type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d4'},
                        codigo: {type: 'string', example: 'PED-001'},
                        cliente_id: {type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d3'},
                        productos: {
                            type: 'array',
                            items: {$ref: '#/components/schemas/OrderItemProduct'},
                            default: [],
                        },
                        servicios: {
                            type: 'array',
                            items: {$ref: '#/components/schemas/OrderItemService'},
                            default: [],
                        },
                        total: {type: 'number', minimum: 0, example: 120.0},
                        estado: {
                            type: 'string',
                            enum: ['creado', 'listo', 'completado', 'cancelado'],
                            example: 'creado',
                        },
                        fecha_registro: {type: 'string', format: 'date-time', example: '2026-01-15T10:30:00Z'},
                        createdAt: {type: 'string', format: 'date-time'},
                        updatedAt: {type: 'string', format: 'date-time'},
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: {type: 'boolean', example: false},
                        message: {type: 'string', example: 'Ha ocurrido un error'},
                    },
                },
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: {type: 'boolean', example: true},
                        message: {type: 'string', example: 'Operación exitosa'},
                        data: {type: 'object'},
                    },
                },
            },
        },
    },

    // Rutas donde swagger-jsdoc buscará comentarios @swagger
    apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;


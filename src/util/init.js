use dbMARVI
    db.usuarios.insertOne({
        fecha_registro: new Date(),
        usuario: "admin",
        nombre: "Administrador",
        primer_apellido: null,
        segundo_apellido: null,
        correo: null,
        contrasena: null,
        rol: "administrador",
        estado: "activo",
        imagen_perfil: null,
    })

db.dropDatabase()
# ApiNetskope

Proyecto fullstack que integra una API en FastAPI (Python) y un frontend en React con mui

# Estructura del proyecto

ApiNetskope/
├── apiNetskopeBackend/
│ ├── app/
│ ├── Dockerfile.dev
│ ├── requirements.txt
│ ├── .env.dev
│ └── .env.prod
│
├── apiNetskopeFrontend/
│ ├── src/
│ ├── Dockerfile.dev
│ ├── .env.dev
│ └── .env.prod
│
├── docker-compose.dev.yml
└── README.md

# Requisitos Previos

// Clonar repositorio de github

git clone https://github.com/JpzGamma/ApiNetskope.git

# crear los archivos env.dev en el backend y el frontend como la muestra

# Instalación de Docker & Docker Compose

// Actualiza los paquetes

sudo apt update

sudo apt install -y ca-certificates curl gnupg lsb-release

// Agregar la clave GPG de Docker

sudo mkdir -p /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

// Agregar el repositorio oficial de Docker

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

// Instalar Docker Engine y Docker Compose Plugin

sudo apt update

sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

// Verificación que Docker esté instalado

docker --version

docker compose version

# Docker & Docker compose para la creacion de contenedores y levantamiento 

docker compose -f docker-compose.dev.yml build --no-cache 

docker compose -f docker-compose.dev.yml up -d

// Apagar el contenedor

docker compose -f docker-compose.dev.yml down

# NOTA

Si no se apaga el docker debes reiniciar la máquina virtual hasta que los contenedores no salgan en RUN, si persiste el problema posiblemente se trate de un Bug de la máquina virtual.

# Acceder al portal web 

http://localhost:3005

# Documentacion swagger

http://localhost:8001/docs


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

Clonar repositorio de github

git clone https://github.com/JpzGamma/ApiNetskope.git

Docker & Docker compose para la creacion de contenedores y levantamiento 



docker compose -f docker-compose.dev.yml build --no-cache 
docker compose -f docker-compose.dev.yml up -d


Acceder al portal web 

http://localhost:3005

Documentacion swagger

http://localhost:8001/docs


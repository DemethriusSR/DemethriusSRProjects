.PHONY: up down build logs dev-backend dev-frontend clean

up:
	docker-compose up -d --build

down:
	docker-compose down

build:
	docker-compose build --no-cache

logs:
	docker-compose logs -f

logs-api:
	docker-compose logs -f backend

logs-web:
	docker-compose logs -f frontend

dev-backend:
	cd backend && npm install && npm run dev

dev-frontend:
	cd frontend && npm install && npm run dev

clean:
	docker-compose down -v --rmi local
	rm -rf backend/node_modules frontend/node_modules frontend/dist

ps:
	docker-compose ps

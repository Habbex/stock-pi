start:
	@docker-compose up -d

stop:
	@docker-compose down

restart:
	@make stop
	@make start

logs:
	@docker-compose logs -f client
	@docker-compose logs -f server
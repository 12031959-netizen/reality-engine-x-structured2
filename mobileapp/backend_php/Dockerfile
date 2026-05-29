FROM php:8.2-apache

RUN docker-php-ext-install mysqli

COPY . /var/www/html/
RUN chmod +x /var/www/html/start.sh

EXPOSE 80

CMD ["/var/www/html/start.sh"]

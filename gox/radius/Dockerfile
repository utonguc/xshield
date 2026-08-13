FROM freeradius/freeradius-server:3.2.5
USER root

# goX özel config: sql modülü + clients + default virtual server
COPY mods-sql      /etc/raddb/mods-available/sql
COPY clients.conf  /etc/raddb/clients.conf
COPY sites-default /etc/raddb/sites-enabled/default
COPY entrypoint.sh /gox-entrypoint.sh

RUN ln -sf /etc/raddb/mods-available/sql /etc/raddb/mods-enabled/sql \
 && chmod +x /gox-entrypoint.sh

EXPOSE 1812/udp 1813/udp
ENTRYPOINT ["/gox-entrypoint.sh"]

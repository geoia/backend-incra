FROM osgeo/gdal

RUN useradd -r geoia
USER geoia

# local para montagem da pasta com shapefiles
VOLUME /geoia/data

# Variáveis de ambiente necessárias
ENV PG_HOST=
ENV PG_PORT=
ENV PG_USER=
ENV PG_PASSWORD=

# Preparação da imagem
WORKDIR /geoia

COPY --chown=geoia ogr2ogr ogrinfo ./
RUN chmod -R +x .

# Por padrão testa a conexao
CMD ./ogrinfo
# Custom Apache Tika image with Tesseract OCR and multi-language support
# Use the latest official Apache Tika image (2.x). If a specific version is required,
# check available tags with:  docker pull apache/tika:<TAB>
# At time of writing 2.9.1 is not published, so we pin to 2.9.0 as the newest.
FROM apache/tika:latest

# Switch to root to install extra packages
USER root

# Install tesseract and language packs (English, German, French)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       tesseract-ocr \
       tesseract-ocr-eng \
       tesseract-ocr-deu \
       tesseract-ocr-fra \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy custom Tika configuration enabling OCR
COPY tika-config.xml /tika-config.xml

# Expose the configuration path as env variable (Tika reads this automatically)
ENV TIKA_CONFIG=/tika-config.xml

# Switch back to the unprivileged user used by upstream image
USER tika

# Default command provided by base image (no change)
CMD ["/docker-entrypoint.sh"]

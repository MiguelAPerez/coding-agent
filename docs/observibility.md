# Observiblity

To help debug and trace requests we're using [OpenTelemetry](https://opentelemetry.io/) for our observiblity solution.

Unless a url is provided for the OTLP endpoint, we'd discard all traces. Use the `OTLP_ENDPOINT` env var to provide the url.

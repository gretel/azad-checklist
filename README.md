# AZ-104 Checklist

Exam study checklist application for Azure.

## Deployment

### Quick (shell script)

```sh
# Requires BASH

./deploy.sh [location] [dns_name]
```

### Declarative (OpenTofu)

[`OpenTofu`](https://opentofu.org/docs/intro/install/) is an `HCL`-compatible `IaC` tool.

```sh
# Requires OpenTofu (or Terraform)

cd tofu
tofu init
tofu apply

# Upload Assets
./upload.sh "$(tofu output -raw resource_group)" "$(tofu output -raw vm_name)"

# Visit in browser, accept self-signed cert warning
curl -k "$(tofu output -raw fqdn)"

# Short Lifecycle :)
tofu destroy
```

#### Dependency graph

`OpenTofu` can export a `DOT` dependency graph and render it as `PNG`.

```sh
# Requires Graphviz (dot)

cd tofu
tofu graph | dot -Tpng > graph.png
```

## License

CC0 1.0 Universal (Public Domain)
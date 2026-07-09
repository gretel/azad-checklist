# AZ-104 Checklist

Exam study checklist for Azure AZ-104.

```
├── assets/
│   ├── checklist-data.json
│   ├── index.html
│   ├── script.js
│   └── style.css
├── deploy.sh
├── tofu/         # OpenTofu alternative (see below)
└── README.md
```

## Deploy

### Quick (shell script)

```sh
./deploy.sh [location] [dns_name]
```

### OpenTofu (declarative)

[OpenTofu](https://opentofu.org) drop-in replacement. Teaches infra-as-code basics.

```sh
cd tofu
tofu init
tofu apply                     # provision VM + nginx
./upload.sh "$(tofu output -raw resource_group)" "$(tofu output -raw vm_name)"   # upload assets
tofu destroy                   # tear down
```

## License

CC0 1.0 Universal (Public Domain)
# kctx
Kubernetes context tool.

functionalities:
- switches k8s context (you can pass only words that are included in context name, like "dev"), supports yargs completions
- prints prompt for ps1 (tested on bash and zsh on MacOS) with colored output (configurable by `colorRules` json in script)
- prints all available contexts


## Installation

`npm install -g .`


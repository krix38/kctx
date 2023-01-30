# kctx
Kubernetes context tool.

functionalities:
- `s` - switches k8s context (you can pass words that are included in context name, like "dev"), supports yargs completions
- `p` - prints prompt for ps1 (tested on bash and zsh on MacOS) with colored output (configurable by `~/.kctx.json` config file)
- `c` - prints all available colors
- `ls` - prints all available contexts


## Installation

`npm install -g kctx`

### Prompt setup

zsh:

```
setopt PROMPT_SUBST
PROMPT=$'$(echo $(kctx p))'$'\n'$PROMPT
```

bash:
```
export PS1='$(kctx p)'$'\n'$PS1
```

For context name completions use yargs `completions` on `s` command.

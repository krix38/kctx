#!/usr/bin/env node

"use strict";

import { exec } from "child_process";
import { load } from "js-yaml";
import { homedir } from "os";
import { readFileSync, existsSync, writeFileSync } from "fs";
import yargs from "yargs";

const colors = {
    "black": 30,
    "red": 31,
    "green": 32,
    "yellow": 33,
    "blue": 34,
    "magenta": 35,
    "cyan": 36,
    "lightGray": 37,
    "gray": 90,
    "lightRed": 91,
    "lightGreen": 92,
    "lightYellow": 93,
    "lightBlue": 94,
    "lightMagenta": 95,
    "lightCyan": 96,
    "white": 97
}

const getCurrentShell = () => {
    const shellPath = process.env.SHELL;
    return shellPath.substring(shellPath.lastIndexOf('/') + 1);
}

const applyColor = (color, escapeForZsh, text) => (text) => {
    if(escapeForZsh && getCurrentShell === "zsh") {
        return "\\e[" + color + ";1m" + text + "\\e[0m";
    }
    return "\x1B[" + color + "m\x1B[1m" + text + "\x1B[22m\x1B[39m"
}

const colorRulesDefaults = {
    "dev": "green",
    "staging": "yellow",
    "prod": "red"
}

const loadRulesConfig = () => {
    const configPath = homedir() + "/.kctx.json";
    if (existsSync(configPath)) {
        return JSON.parse(readFileSync(configPath));
    }
    writeFileSync(configPath, JSON.stringify(colorRulesDefaults, null, 2));
    return colorRulesDefaults;
}

const shellEscape = (str) => str.replaceAll(":", "\\:");

const applyColorRule = (contextName) => {
    const rulesConfig = loadRulesConfig();
    const colorRuleKey = Object.keys(rulesConfig).filter(ruleKey => contextName.includes(ruleKey));
    if (colorRuleKey.length > 0) {
        return applyColor(colors[rulesConfig[colorRuleKey[0]]], true)(contextName);
    }
    return contextName;
}

const colorError = (line) => applyColor(colors.red)("ERROR: " + line);

const getKubeConfig = () => {
    const pathFromVariable = process.env.KUBECONFIG;
    const kubeConfigPath = pathFromVariable || homedir() + "/.kube/config";
    const kubeConfigYaml = readFileSync(kubeConfigPath, 'utf-8');
    return load(kubeConfigYaml);
}

const loadContextsNames = (kubeConfig) => kubeConfig.contexts.map(context => context.name);

const getContextsCommand = () => {
    const kubeConfig = getKubeConfig();
    const selectedcontext = kubeConfig["current-context"];
    const contextNames = loadContextsNames(kubeConfig);
    contextNames.forEach(contextName => {
        const line = "• " + contextName;
        const styledLine = contextName === selectedcontext ? applyColor(colors.yellow)(line) : line;
        console.log(styledLine);
    })
}

const printSelectedContextPromptCommand = () => {
    const kubeConfig = getKubeConfig();
    const selectedcontext = kubeConfig["current-context"];
    const selectedNamespace = kubeConfig.contexts
        .filter(context => context.context === selectedcontext)
        .map(context => context.namespace);
    const namespace = selectedNamespace.length > 0 ? applyColorRule(selectedNamespace[0]) : applyColor(colors.lightCyan, true)("default");
    const line = "(" + applyColor(colors.lightBlue, true)("⎈") + "|" + applyColorRule(selectedcontext) + "|" + namespace + ")";
    console.log(line);
}

const setContextCommand = (argv) => {
    const kubeConfig = getKubeConfig();
    const contextNameToBeSelected = argv.name;
    const contextNames = loadContextsNames(kubeConfig);
    const fullcontextName = contextNames.filter(contextName => contextName.includes(contextNameToBeSelected));
    if (fullcontextName.length === 0) {
        console.error(colorError("Could not find context with name which would contain " + contextNameToBeSelected));
    }
    if (fullcontextName.length > 1) {
        console.error(colorError("More then one context with this name was found: " + contextNameToBeSelected));
    }
    if (fullcontextName.length === 1) {
        exec("kubectl config use-context " + fullcontextName);
        console.log("context set to " + fullcontextName);
    }
}

const printColorsCommand = () => 
    Object.keys(colors)
        .forEach(colorKey => console.log(applyColor(colors[colorKey])("• " + colorKey)));

yargs(process.argv.slice(2))
    .scriptName("kctx")
    .usage("$0 <cmd> [params]")
    .command(
        "ls", 
        "Prints available contexts", 
        getContextsCommand)
    .command(
        "c",
        "Print available colors",
        printColorsCommand)
    .command(
        "p", 
        "Prints context prompt", 
        printSelectedContextPromptCommand)
    .command(
        "s [name]", 
        "Switches context name", 
        yargs => yargs
            .positional("name", { type: "string", describe: "Context name"})
            .completion("completion", (current, argv, completionFilter, done) =>
                    completionFilter(() => 
                        done(loadContextsNames(getKubeConfig())
                        .map(result => shellEscape(result)))
                    )
                ), 
        setContextCommand)
    .demandCommand()
    .argv;

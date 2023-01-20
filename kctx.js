#!/usr/bin/env node

"use strict";

import { exec } from "child_process";
import { load } from "js-yaml";
import { homedir } from "os";
import { readFileSync } from "fs";
import yargs from "yargs";

const colors = {
    red: 31,
    green: 32,
    yellow: 33,
    lightCyan: 96,
    lightBlue: 94
}

const getCurrentShell = () => {
    const shellPath = process.env.SHELL;
    return shellPath.substring(shellPath.lastIndexOf('/') + 1);
}

const applyColor = (color, escapeForZsh) => (text) => {
    if(escapeForZsh && getCurrentShell === "zsh") {
        return "\\e[" + color + ";1m" + text + "\\e[0m";
    }
    return "\x1B[" + color + "m\x1B[1m" + text + "\x1B[22m\x1B[39m"
}

const colorRules = {
    "dev": applyColor(colors.green, true),
    "staging": applyColor(colors.yellow, true),
    "prod": applyColor(colors.red, true)
}

const shellEscape = (str) => str.replaceAll(":", "\\:");

const applyColorRule = (contextName) => {
    const colorRuleKey = Object.keys(colorRules).filter(ruleKey => contextName.includes(ruleKey));
    if (colorRuleKey.length > 0) {
        return colorRules[colorRuleKey[0]](contextName);
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

yargs(process.argv.slice(2))
    .scriptName("kctx")
    .usage("$0 <cmd> [params]")
    .command(
        "ls", 
        "Prints available contexts", 
        getContextsCommand)
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

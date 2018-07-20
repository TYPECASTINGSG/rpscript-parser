import fs from 'fs';
import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts';
import { ParseTreeWalker } from "antlr4ts/tree/ParseTreeWalker";

import {RPScriptParser} from '../antlr/grammar/RPScriptParser';
import {RPScriptLexer} from '../antlr/grammar/RPScriptLexer';
import {RPScriptListener} from '../antlr/grammar/RPScriptListener';

import {RpsTranspileListener} from '../antlr/RpsListener';
import {ErrorCollectorListener} from '../antlr/RpsErrorHandling';

import {Deferred} from "ts-deferred";

import { EventEmitter } from 'events';

var _eval = require('../../lib/eval');
import {RpsContext} from 'rpscript-interface';
import {TranspileContent} from '../antlr/RpsListener';

import {ModuleMgr} from './modulemgr';
import shell from 'shelljs';
import yaml from '../../lib/js-yaml.min';
import { KeywordsMgr } from '..';

export interface RpsMainConfig{
    outputDir?:string; // for logs/temp files => .rpscript
    skipLinting?:boolean; //deprecated
    skipOutputTS?:boolean;
    skipRun?:boolean;  //for verify
    modules?:string[];  //only run these modules
    configFilesLocation?:string;
    skipKeywordCheck?:boolean;
}
export interface ExecResult {
    transpile?:TranspileContent
}

export class Runner extends EventEmitter{
    static readonly COMPILE_START_EVT = "runner.compile.start";
    static readonly TRANSPILE_EVT = "runner.transpile";
    static readonly TRANSPILE_ERR_EVT = "runner.transpile.err";
    static readonly LINT_EVT = "runner.linted";
    static readonly COMPILED_EVT = "runner.compiled";

    static readonly MOD_LOADED_EVT = "runner.module.loaded";
    static readonly MOD_DISABLED_EVT = "runner.module.disabled";
    
    static readonly START_EVT = "runner.start";
    static readonly END_EVT = "runner.end";

    static readonly ACTION_EVT = "action";

    static readonly CTX_PRIOR_SET_EVT = "context.priority.set";

    config:RpsMainConfig;
    runnerListener:EventEmitter;
    wordMgr : KeywordsMgr;

    constructor(config:RpsMainConfig){
        super();
        this.config = config;
        this.wordMgr = new KeywordsMgr;
    }

    async execute (filepath:string, args:any[],content?:string) :Promise<ExecResult>{
        this.emit(Runner.COMPILE_START_EVT,filepath);
        
        let rpsContent = filepath ? fs.readFileSync(filepath,'utf8') : content;
        let transpileContent:TranspileContent;

        try {
            
            transpileContent = await this.transpile(filepath,rpsContent);

        }catch(err){
            this.emit(Runner.TRANSPILE_ERR_EVT,err);
            return {};
        }
        let tsContent = transpileContent.fullContent;
        let verbs = transpileContent.verbs;

 
        this.emit(Runner.COMPILED_EVT , { transpile:tsContent });
        
        if(!this.config.skipRun) this.run(tsContent,verbs,args);
        

        return { transpile:transpileContent };
    }

    private async transpile(filepath:string, filecontent:string):Promise<TranspileContent>{
        let result = await this.convertToTS(filepath, filecontent);
        let tsContent = result.fullContent;

        this.emit(Runner.TRANSPILE_EVT,result);

        return result;
    }

    private async run (tsContent:string, verbs:string[],args?:any[]) {
        let context = await this.initializeContext(verbs,args); //loading modules
        
        this.setupModulesContext(context['$CONTEXT']); //calling modules' setup lifecycle

        this.runnerListener = await _eval(tsContent,context,true);

        this.runnerListener.on(Runner.START_EVT, (...params) => this.emit(Runner.START_EVT,params) );
        this.runnerListener.on(Runner.END_EVT, (...params) => this.emit(Runner.END_EVT,params) );
        this.runnerListener.on(Runner.ACTION_EVT, (...params) => this.emit(Runner.ACTION_EVT,params) ); 

        return this.runnerListener;
    }

    setupModulesContext (ctx:RpsContext) {
        let allCtx = ctx.getAllContexts();
        allCtx.forEach(ctx => {
            if(ctx['setup'])ctx['setup'](ctx);
        });
    }

    async initializeContext(verbs:string[],args:any[] = []) {
        let modMgr = new ModuleMgr
        
        modMgr.event.on(Runner.MOD_LOADED_EVT,(...params)=>this.emit(Runner.MOD_LOADED_EVT,params));
        modMgr.event.on(Runner.MOD_DISABLED_EVT,(...params)=>this.emit(Runner.MOD_DISABLED_EVT,params));

        let rpsContext = this.initRpsContext(this.config.configFilesLocation,args);

        let modulesToBeLoaded = this.determineModulesToLoad(verbs);
        let context = await modMgr.loadModuleObjs(rpsContext,modulesToBeLoaded);

        context['EventEmitter'] = EventEmitter;
    
        context['$CONTEXT'] = rpsContext;

        rpsContext.event.on(Runner.CTX_PRIOR_SET_EVT,(...params)=>this.emit(Runner.CTX_PRIOR_SET_EVT,params));

        return context;
    }

    determineModulesToLoad (verbs?:string[]) {
        let modules = this.config.modules;
        if(!modules) {
            modules = this.wordMgr.getKeywordsModules(verbs);
        }
        return modules;
    }

    //config convention: rps-<module-id>.yaml
    initRpsContext(configLoc:string,args:any[]) :RpsContext {
        let ctx = new RpsContext();
        ctx['env'] = args; // ctx.setEnvArgs(args);
        
        let configPath = configLoc ? configLoc : process.cwd();
        let pathfiles = shell.ls(configPath);

        pathfiles.forEach(file => {
            
            if(file.trim().startsWith('rps-')){
                let moduleCtx = yaml.safeLoad(fs.readFileSync(configPath+'/'+file,'utf8'));
                let moduleId = file.substring(file.lastIndexOf("rps-") + 4, file.lastIndexOf("."));

                ctx.addModuleContext(moduleId,moduleCtx);
            }
        });

        return ctx;
    }

    convertToTS(filepath:string, content:string) : Promise<TranspileContent> {
        let d = new Deferred<TranspileContent>();

        let lexer = this.setupLexer(content);
        let parser = this.setupParser(lexer);

        let intentListener:RPScriptListener = 
            new RpsTranspileListener(d,filepath,parser,this.config.skipKeywordCheck);
        let context = parser.program();

        ParseTreeWalker.DEFAULT.walk(intentListener, context);

        return d.promise;
    }

    private setupLexer (content:string) : RPScriptLexer {
        let inputStream = new ANTLRInputStream(content);
        // let lexer = new RpsTranspileLexer(inputStream);
        let lexer = new RPScriptLexer(inputStream);

        lexer.removeErrorListeners();

        return lexer;
    }
    private setupParser (lexer:RPScriptLexer) : RPScriptParser{
        let tokenStream = new CommonTokenStream(lexer);
        let parser = new RPScriptParser(tokenStream);

        parser.removeErrorListeners();
        parser.addErrorListener(new ErrorCollectorListener);

        return parser;
    }


}


import fs from 'fs';
import R from 'ramda';
import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts';
import { ParseTreeWalker } from "antlr4ts/tree/ParseTreeWalker";

import {RPScriptParser} from '../antlr/grammar/RPScriptParser';
import {RPScriptLexer} from '../antlr/grammar/RPScriptLexer';
import {RpsTranspileLexer} from '../antlr/RpsTranspileLexer';
import {RPScriptListener} from '../antlr/grammar/RPScriptListener';

import {RpsTranspileListener} from '../antlr/RpsListener';
import {ErrorCollectorListener} from '../antlr/RpsErrorHandling';

import {Deferred} from "ts-deferred";

import { Linter, Configuration, LintResult } from "tslint";
import { EventEmitter } from 'events';

var _eval = require('eval');
import {RpsContext} from 'rpscript-interface';
import {TranspileContent} from '../antlr/RpsListener';

import {ModuleMgr} from './modulemgr';


export interface RpsMainConfig{
    outputDir?:string;
    skipLinting?:boolean;
    skipOutputTS?:boolean;
    skipRun?:boolean;
}
export interface ExecResult {
    transpile:TranspileContent,
    lint:LintResult
}

export class Runner extends EventEmitter{
    static readonly TRANSPILE_EVT = "runner.transpile";
    static readonly LINT_EVT = "runner.linted";
    static readonly COMPILED_EVT = "runner.compiled";
    static readonly START_EVT = "runner.start";
    static readonly END_EVT = "runner.end";
    static readonly ACTION_EVT = "action";

    config:RpsMainConfig;
    runnerListener:EventEmitter;

    constructor(config:RpsMainConfig){
        super();
        let defaultConfig = JSON.parse(fs.readFileSync(`${__dirname}/../../rpsconfig.default.json`,'utf-8'));
        this.config = R.merge(defaultConfig, config);
                
        if(!fs.existsSync(this.config['outputDir'])) {
            fs.mkdirSync(this.config['outputDir']);
            fs.mkdirSync(this.config['outputDir']+'/logs');
        }
    }

    async execute (filepath:string) :Promise<ExecResult>{
        let rpsContent = fs.readFileSync(filepath,'utf8');

        let lintResult:LintResult = null;

        let result = await this.convertToTS(filepath, rpsContent);
        let tsContent = result.fullContent;

        this.emit(Runner.TRANSPILE_EVT,result);

        // if(!this.config.skipLinting) {
        if(false) {
            lintResult = this.linting(tsContent);

            this.emit(Runner.LINT_EVT, lintResult);

            if(lintResult.errorCount>0) throw Error('linting error');
        }

        let context = await this.initializeContext();

        this.emit(Runner.COMPILED_EVT , { transpile:result, lint:lintResult });
        
        if(!this.config.skipRun){
            this.runnerListener = await _eval(tsContent,context,true);

            this.runnerListener.on(Runner.START_EVT, (...params) => this.emit(Runner.START_EVT,params) );
            this.runnerListener.on(Runner.END_EVT, (...params) => this.emit(Runner.END_EVT,params) );
            this.runnerListener.on(Runner.ACTION_EVT, (...params) => this.emit(Runner.ACTION_EVT,params) );    
        }

        return { transpile:result, lint:lintResult };
    }


    async initializeContext() {
        let modMgr = new ModuleMgr
        let context = await modMgr.loadModuleObjs();

        context['RpsContext'] = RpsContext;
        context['EventEmitter'] = EventEmitter;
    
        context['$CONTEXT'] = new RpsContext();
        context['$RESULT'] = null;

        return context;
    }

    convertToTS(filepath:string, content:string) : Promise<TranspileContent> {
        let d = new Deferred<TranspileContent>();

        let lexer = this.setupLexer(content);
        let parser = this.setupParser(lexer);

        let intentListener:RPScriptListener = new RpsTranspileListener(d,filepath,parser);
        let context = parser.program();

        ParseTreeWalker.DEFAULT.walk(intentListener, context);

        return d.promise;
    }

    private setupLexer (content:string) : RPScriptLexer {
        let inputStream = new ANTLRInputStream(content);
        let lexer = new RpsTranspileLexer(inputStream);

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

    
    linting (tsContent:string) : LintResult {
        // const configurationFilename = __dirname+"/../../tslint.json";
        const configurationFilename = __dirname+"/../../tsconfig.tslint.json";
        const options = {
            fix:false,
            formatter: "json"
        };
        
        const linter = new Linter(options);
        const configLoad = Configuration.findConfiguration(configurationFilename, "");
        
        linter.lint("", tsContent, configLoad.results);
        
        return linter.getResult();
    }

}


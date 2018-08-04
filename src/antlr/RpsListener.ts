import {Deferred} from "ts-deferred";
// import {Logger} from '../core/logger';
import fs from 'fs';
import * as R from '../../lib/ramda.min';
import {ParserRuleContext} from 'antlr4ts';

import {RPScriptListener} from './grammar/RPScriptListener';
import {SymbolContext, VariableContext,LiteralContext,ObjectLiteralContext,ProgramContext, PipeActionsContext, SingleActionContext,
  SingleExpressionContext, StatementContext, ActionContext, OptContext, ArrayLiteralContext, PropertyAssignmentContext, ShortFnContext} from './grammar/RPScriptParser';

import {ParseTreeProperty} from 'antlr4ts/tree';
import {RPScriptParser} from '../antlr/grammar/RPScriptParser';

import {KeywordsMgr} from '../core/keywordsmgr';
import {Runner} from '../core/runner';
import { InvalidKeywordException } from "./InvalidKeywordException";

export interface TranspileContent {
  mainContent?:string;
  fnContent?:string;
  fullContent?:string;
  verbs?:string[];
}
export interface IncludeContent {
  dir:string;
  rpsContent:string;
  tsContent?:string;
}

export class RpsTranspileListener implements RPScriptListener {

  readonly globalEventDeclare:string = `module.exports = new EventEmitter();\n`;
  readonly mainSectionStart:string = 
  `async function main(){
    module.exports.emit('runner.start');\n
`;
  readonly mainSectionEnd:string = `
    module.exports.emit('runner.end');
}`;
readonly runSect:string = `

$CONTEXT.event.on ('action', (...params) => {
    let evt = params[2];
    if(evt === 'end') {$CONTEXT.$RESULT = params[3];}
    if(evt === 'error') $CONTEXT.$ERROR = params[3];

    module.exports.emit('action',params);
});
setTimeout(main, 100);
`
  logger;

  deferred:Deferred<any>;

  // translator:Translator;
  
  filepath:string;

  parseTreeProperty:ParseTreeProperty<string>;

  scope:string;

  content:TranspileContent;
  includeContent:IncludeContent[];
  parser:RPScriptParser;

  keywordMgr:KeywordsMgr;

  skipKeywordCheck:boolean;

  constructor(defer:Deferred<any>,filepath:string, parser:RPScriptParser,skipKeywordCheck?:boolean){
    this.deferred = defer;
    // this.logger = Logger.getInstance();
    this.filepath = filepath;
    this.parseTreeProperty = new ParseTreeProperty();
    this.scope = "root";
    this.parser=parser;
    this.content = {
      mainContent:"", fullContent:"",fnContent:"",verbs:[]
    }
    this.includeContent = [];
    this.keywordMgr = new KeywordsMgr;
    this.skipKeywordCheck = skipKeywordCheck;
  }

  public enterProgram(ctx: ProgramContext) : void{
  }
  public exitProgram(ctx: ProgramContext) : void{
    if(ctx.exception) throw ctx.exception;
    // if(ctx.exception) this.deferred.reject(ctx.exception)
    else {
        this.content.fullContent += this.globalEventDeclare;
        this.content.fullContent += this.mainSectionStart;
        this.content.fullContent += this.content.mainContent;
        this.content.fullContent += this.mainSectionEnd;
        this.content.fullContent += this.content.fnContent;

        this.content.fullContent += this.runSect;
  
        this.deferred.resolve(this.content);
    }
  }


  public exitPipeActions(ctx:PipeActionsContext) : void {
    
    let firstActionContext = this.parseTreeProperty.get(ctx.action()[0]);
    let secActionContext = this.parseTreeProperty.get(ctx.action()[1]);

    let content = '\t'+secActionContext.replace(')', ', '+firstActionContext) + ');\n';
    
    if(this.hasActionParent(ctx)) this.parseTreeProperty.set(ctx,content);
    else this.appendToScope(content);
  }

  public exitStatement(ctx:StatementContext) : void {
    if(!!ctx.singleAction()){
      let action = this.parseTreeProperty.get(ctx.singleAction().action());
      this.parseTreeProperty.set(ctx,action);
    }
    else if(!!ctx.pipeActions()){
      let context = this.parseTreeProperty.get(ctx.pipeActions());
      this.parseTreeProperty.set(ctx,context);
    }
  }

  public enterAction(ctx:ActionContext) : void {
    if(!this.skipKeywordCheck){
      let recommendedKW = this.keywordMgr.isValidKeyword(ctx.WORD().text);
      if(recommendedKW)
        throw new InvalidKeywordException(ctx,recommendedKW);
    }

    this.content.verbs.push(ctx.WORD().text.trim());
    
    this.parseTreeProperty.set(ctx,`\t${ctx.WORD().text}`);
  }
  public exitAction(ctx:ActionContext) : void {
    let keyword = this.parseTreeProperty.get(ctx);

    let pList:string[] = R.map(param => {
      return this.parseTreeProperty.get(param.getChild(0));
    },ctx.paramList().param());

    let opt = this.parseOpt(ctx.optList().opt()) , joinList = pList.join(' , ');

    
    if(joinList)
      this.parseTreeProperty.set(ctx,`api("${keyword.trim()}" , $CONTEXT , ${opt} , ${joinList})`);
    else
      this.parseTreeProperty.set(ctx,`api("${keyword.trim()}" , $CONTEXT , ${opt} )`);

    if(!this.hasActionParent(ctx)){
      let content = "\t"+this.parseTreeProperty.get(ctx)+";\n";

      if(this.hasPipeParent(ctx)) {} //skip
      else  this.content.mainContent += content;
    }
  }

  public exitShortFn(ctx:ShortFnContext) : void {
    let val = '';
    if(ctx.variableList()) {
      val = '('+ctx.variableList().text+') => ' + this.parseTreeProperty.get(ctx.action()); 
    }else {
      let params = ctx.variable().map(x=>x.text);
      val = '('+params.join(',')+') => ' + this.parseTreeProperty.get(ctx.action());
    }
    
    this.parseTreeProperty.set(ctx,val);
  }

  // literal | variable | anonFn | symbol | action;
  public enterLiteral(ctx:LiteralContext) : void {
    let val = ctx.text;
    if(ctx.TemplateStringLiteral()) {
      val = val.replace(new RegExp('[$]RESULT', 'g'), '$CONTEXT.$RESULT');
      val = val.replace(new RegExp('[$]ERROR', 'g'), '$CONTEXT.$ERROR');
    }
    if(ctx.EnvVarLiteral()) {
      val = val.substr(2);
      val = '$CONTEXT.env['+val+']';
    }

    this.parseTreeProperty.set(ctx,`${val}`);
  }

  public enterVariable(ctx:VariableContext) : void {
    let variable = this.parseVar(ctx);

    this.parseTreeProperty.set(ctx,`${variable}`);
  }
  public enterSymbol(ctx:SymbolContext) : void {
    var lower = ctx.text.charAt(0).toLowerCase() + ctx.text.substr(1);
    this.parseTreeProperty.set(ctx,`Symbol('${lower}')`);
  }

  public exitSingleExpression(ctx:SingleExpressionContext) : void {
    if(ctx.variable && ctx.variable())
      this.parseTreeProperty.set( ctx, this.parseTreeProperty.get(ctx.variable()) );

    else if(ctx.literal && ctx.literal()){
      let template = ctx.literal().TemplateStringLiteral(), env = ctx.literal().EnvVarLiteral();

      if(template || env) 
        this.parseTreeProperty.set( ctx, this.parseTreeProperty.get(ctx.literal()) );
      
      else this.parseTreeProperty.set(ctx,ctx.text);

    }else if(ctx.action && ctx.action()) {
      this.parseTreeProperty.set( ctx, this.parseTreeProperty.get(ctx.action()) );
    }
    else if(ctx.arrayLiteral && ctx.arrayLiteral()) {
      this.parseTreeProperty.set( ctx, this.parseTreeProperty.get(ctx.arrayLiteral()) );
    }

    else if(ctx.objectLiteral && ctx.objectLiteral()) {
      this.parseTreeProperty.set( ctx, this.parseTreeProperty.get(ctx.objectLiteral()) );
    }

    else if(ctx.shortFn && ctx.shortFn()) {
      this.parseTreeProperty.set( ctx, this.parseTreeProperty.get(ctx.shortFn()) );
    }

    else
      this.parseTreeProperty.set(ctx,ctx.text);
  }

  public exitArrayLiteral(ctx:ArrayLiteralContext){
    if(!ctx.elementList()) this.parseTreeProperty.set(ctx,'[]');
    else {
      let array = [];
      for(var i =0;i<ctx.elementList().singleExpression().length;i++){
        var expr = ctx.elementList().singleExpression()[i];
  
        if(expr.action())array.push(this.parseTreeProperty.get(expr.action()));
        else if(expr.variable())array.push(this.parseTreeProperty.get(expr.variable()));
        else if(expr.arrayLiteral())array.push(this.parseTreeProperty.get(expr.arrayLiteral()));
        else if(expr.objectLiteral())array.push(this.parseTreeProperty.get(expr.objectLiteral()));
        else array.push(expr.text);
      }
      let arString = '['+array.join(',')+']';
  
      this.parseTreeProperty.set(ctx, arString);
    }
  }

  public exitObjectLiteral(ctx:ObjectLiteralContext){
    //action , variable

    let array = [];
    for(var i =0;i<ctx.propertyAssignment().length;i++){
      var expr = ctx.propertyAssignment()[i];
      array.push( this.parseTreeProperty.get(expr) );
    }
    let arString = '{'+array.join(',')+'}';
    

    this.parseTreeProperty.set(ctx, arString);
  }
  public exitPropertyAssignment(ctx:PropertyAssignmentContext){
    let propName = ctx.propertyName().text;

    let expression = ctx.singleExpression();
    //@ts-ignore
    let expr = this.parseTreeProperty.get(expression);
    
    let pair = propName + ':' + expr;

    this.parseTreeProperty.set(ctx, pair);
  }

  /**************************************************************/

  private hasActionParent(ctx:ParserRuleContext) : boolean{
    return this.hasParent(ctx,'ActionContext');
  }

  private hasPipeParent(ctx:ParserRuleContext) : boolean{
    return this.hasParent(ctx,'PipeActionsContext');
  }

  private hasShortFnParent(ctx:ParserRuleContext) : boolean{
    return this.hasParent(ctx,'ShortFnContext');
  }

  hasParent(ctx:ParserRuleContext,parentName:string) : boolean{
    let ctxTemp:any = ctx.parent;
    let isFnParent:boolean = false;
    while (ctxTemp){
      if(parentName === ctxTemp.constructor.name){
        isFnParent = true;
        break;
      }
      ctxTemp = ctxTemp.parent;
    }

    return isFnParent;
  }

  private parseOpt (opts:OptContext[]):any{
    let obj = {};
    R.forEach(opt => {
      let x = opt.optValue();
      let text = "";

      if(x.literal()){
        let res = this.parseTreeProperty.get(x.literal());

        if(x.literal().EnvVarLiteral()) text = res;
        else text = eval(res);
      }
      else if (x.variable()){
        text = this.parseTreeProperty.get(x.variable());
      }else {}
        
      obj[opt.optName().text] = text;
    } , opts);


    let output = JSON.stringify(obj);
    output = output.replace(/(\"[$].*\")+/g, function(val){ return val.replace(/\"/g,"");});

    return output;
  }

  private parseVar (ctx:VariableContext) :string {
    let variable = ctx.text;
    // let parsedVar = "typeof "+variable+" != 'undefined' ? " + variable + " : $CONTEXT.variables."+variable;
    let parsedVar = this.hasShortFnParent(ctx) ? variable : "$CONTEXT.variables."+variable;

    if(ctx.text.trim().startsWith('$RESULT')) variable = '$CONTEXT.'+variable;
    else if(ctx.text.trim().startsWith('$ERROR')) variable = '$CONTEXT.'+variable;
    else variable = parsedVar;

    return variable;
  }

  private appendToScope (content:string) : void{
    if(this.scope === 'root') this.content.mainContent += content;
    else this.content.fnContent += content;
  }
}

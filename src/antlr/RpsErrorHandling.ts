import {NoViableAltException,Parser,DefaultErrorStrategy,ANTLRErrorListener,Recognizer,RecognitionException, ParserRuleContext} from 'antlr4ts';
import { Override } from 'antlr4ts/Decorators';

export class RpsErrorStrategy extends DefaultErrorStrategy {

  //Not working
  @Override
  reportNoViableAlternative(recognizer: Parser, e: NoViableAltException): void {
    // throw new Error(e.message);
  }
}

export class ErrorCollectorListener implements ANTLRErrorListener<any> {

    syntaxError<T>(
      recognizer: Recognizer<T, any>, offendingSymbol: T, 
      line: number, charPositionInLine: number, 
      msg: string, e: RecognitionException): void {
        
        console.error("Problem encountered :"+msg);
        
        this.underlineError(recognizer,offendingSymbol,line,charPositionInLine);
        
    }

    underlineError (recognizer, offendingToken,line, pos) {
      let tokens = recognizer.inputStream;
      // console.log(tokens.tokenSource);
      let input = tokens.tokenSource.inputStream.toString();
      let lines = input.split('\n');
      let errorLine = lines[line-1];

      let start = offendingToken.startIndex;
      let stop = offendingToken.stopIndex;

      console.log(errorLine);
      for(var i=0;i<pos;i++)process.stdout.write(" ");
      if(start>=0 && stop>=0) for(var i:number=start;i<stop+1;i++) process.stdout.write("^");
      console.log('');
    }
  
  }

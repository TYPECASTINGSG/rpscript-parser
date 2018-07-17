grammar RPScript;

program
    : sourceElements? EOF
    ;

sourceElements
    : statement+
    ;

statement
    : pipeActions (NL|EOF)
    | singleAction (NL|EOF)
    | comment
    | exeFn
    | ifelseStatement
    | namedFn
    | NL
    | include NL
    | let;

statementList : statement+;

pipeActions : action PIPE action;
singleAction : action;
comment : COMMENT;

ifelseStatement : ifStatement elifStatement* elseStatement?;

ifStatement : DIRECTIVE IF singleExpression '{' statementList '}' NL*;
elifStatement : DIRECTIVE ELIF singleExpression '{' statementList '}' NL*;
elseStatement : DIRECTIVE ELSE '{' statementList '}';

//maybe replace it with $CONTEXT.$ERROR
// tryStatement : TODO


namedFn : DIRECTIVE WORD variable* block;

exeFn   : DIRECTIVE WORD param*;

include : DIRECTIVE INCLUDE StringLiteral;

let : DIRECTIVE LET StringLiteral singleExpression;

action : WORD paramList optList ;

paramList : param*;
param : literal | variable | anonFn | symbol | action | singleExpression;

optList : opt*;
opt   : '--' optName ('='literal)?;

block : '{' statementList '}';

anonFn : DIRECTIVE variable* block;

singleExpression :             
    // singleExpression '.' identifierName                                                                  
      '+' singleExpression                                                   
    | '-' singleExpression                                                   
    | '!' singleExpression                                                   
    | singleExpression ('*' | '/' | '%') singleExpression                    
    | singleExpression ('+' | '-') singleExpression                          
    | singleExpression ('<' | '>' | '<=' | '>=') singleExpression            
    | singleExpression ('==' | '!=' | '===' | '!==') singleExpression        
    | singleExpression '&&' singleExpression                                 
    | singleExpression '||' singleExpression              
    | literal                                                                
    | arrayLiteral  
    | variable                                                         
    | objectLiteral;


// variable : VAR funct*;
variable : VAR varParams? ( varFunction varParams? ) *;
varFunction : FUNCTION;
varParams    : '(' singleExpression* ')';
literal
    : NullLiteral | BooleanLiteral
    | StringLiteral | TemplateStringLiteral
    | DecimalLiteral;
symbol : SYMBOL;
    
optName : WORD ;
objectLiteral
    : '{' (propertyAssignment (',' propertyAssignment)*)? ','? '}';

arrayLiteral
    : '[' ','* elementList? ','* ']' ;

elementList
    : singleExpression (','+ singleExpression)* ;

propertyAssignment
    : propertyName (':' |'=') singleExpression
    | '[' singleExpression ']' ':' singleExpression
    ;
propertyName : StringLiteral | DecimalLiteral;
eos : EOF;



///////////////////  LEXER  /////////////////////


DIRECTIVE               : '@';

IF                      : 'if';
ELIF                    : 'elif';
ELSE                    : 'else';
LET                      : 'let';
INCLUDE                 : 'include';

PIPE                    : '|';


VAR                     : [$][a-zA-Z0-9]+ ' '*;
FUNCTION                : [.][a-zA-Z0-9]+ ' '*;

// COMMENT : ';' ~[\r\n]*;
COMMENT : ';' ~[\r\n]* -> channel(HIDDEN);


NullLiteral: 'null';
BooleanLiteral: 'true' | 'false';
DecimalLiteral: 
       DecimalIntegerLiteral '.' [0-9]* ExponentPart?
    |  '.' [0-9]+ ExponentPart?
    |  DecimalIntegerLiteral ExponentPart? ;

StringLiteral:                 ('"' DoubleStringCharacter* '"'
             |                  '\'' SingleStringCharacter* '\'')
             ;

TemplateStringLiteral:          '`' ('\\`' | ~'`')* '`';

SYMBOL  : [A-Z][a-zA-Z0-9.]*;
WORD  : [a-z][a-zA-Z0-9-]+;

fragment DoubleStringCharacter       : ~["\\\r\n] | LineContinuation ;
fragment SingleStringCharacter       : ~['\\\r\n] | LineContinuation ;
fragment LineContinuation            : '\\' [\r\n\u2028\u2029] ;
fragment DecimalIntegerLiteral       : '0' | [1-9] [0-9]* ;
fragment ExponentPart                : [eE] [+-]? [0-9]+ ;

NL : '\r'? '\n';

// WS : [ \t\r\n]+ -> skip ;
WS : [ \t]+ -> skip ;

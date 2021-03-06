grammar RPScript;

program : sourceElements? EOF ;

sourceElements : statement+ ;

statement
    : singleAction (NL | EOF)
    | pipeActions (NL | EOF)
    | comment (NL | EOF)
    | NL;

statementList : statement+;

pipeActions : action PIPE action;
singleAction : action;
comment : COMMENT;

action : WORD optList paramList | '(' WORD optList paramList ')' ;

paramList : param*;
param : singleExpression;
// param : singleExpression | literal | variable | anonFn | symbol | action;

optList : opt*;
opt   : '--' optName ('='optValue)?;

singleExpression :                                                                    
    literal                                               
    | shortFn                 
    | arrayLiteral  
    | variable                                  
    | action            
    | symbol           
    | objectLiteral;


shortFn : '(' ( (variable (COMMA_SEPERATOR variable)*) | variableList )? ')' '=>' action;
// variable : VAR varParams? ( varFunction varParams? ) *;
variable : VAR;
variableList : '...'VAR;
// varFunction : FUNCTION;
varParams    : '(' singleExpression* ')';
literal
    : NullLiteral | BooleanLiteral
    | StringLiteral | TemplateStringLiteral
    | DecimalLiteral | JS_OBJECT | EnvVarLiteral;
symbol : SYMBOL;
    
optName : WORD ;
optValue : literal | variable;

objectLiteral
    : OPEN_CURLY_BRACKET (propertyAssignment (COMMA_SEPERATOR propertyAssignment)*)? COMMA_SEPERATOR? CLOSE_CURLY_BRACKET;

arrayLiteral : OPEN_BRACKET  elementList?  CLOSE_BRACKET ;
// arrayLiteral : '[' ('\n')? elementList? ']' ;

elementList : singleExpression (COMMA_SEPERATOR singleExpression)* ;
// elementList : singleExpression (','+ '\n'* singleExpression)* ;

propertyAssignment : propertyName ':' singleExpression;
propertyName : StringLiteral | DecimalLiteral | WORD | SYMBOL;



///////////////////  LEXER  /////////////////////

DIRECTIVE               : '@';
PIPE                    : '|';
OPEN_CURLY_BRACKET      : '{'[ \n]*;
CLOSE_CURLY_BRACKET     : [ \n]*'}';
OPEN_BRACKET            : '['[ \n]*;
CLOSE_BRACKET           : [ \n]*']';
COMMA_SEPERATOR         : [ \n]*[,][ \n]*;
EnvVarLiteral           : '$$' [0-9]+ ' '*;
VAR                     : [$][a-zA-Z0-9]+ ' '*;
JS_OBJECT               : 'String' | 'Number' | 'Object' | 'Function'
                        | 'Date' | 'Array' | 'Error' | 'RegExp';
// FUNCTION                : [.][a-zA-Z0-9]+ ' '*;

COMMENT : ';' ~[\r\n]* -> channel(HIDDEN);

NullLiteral: 'null';
BooleanLiteral: 'true' | 'false';
DecimalLiteral: 
       '-'? DecimalIntegerLiteral '.' [0-9]* ExponentPart?
    |  '.' [0-9]+ ExponentPart?
    |  '-'? DecimalIntegerLiteral ExponentPart? ;

StringLiteral:                 ('"' DoubleStringCharacter* '"'
             |                  '\'' SingleStringCharacter* '\'')
             ;

TemplateStringLiteral:          '`' ('\\`' | ~'`')* '`';

SYMBOL  : [A-Z][a-zA-Z0-9.]*;
WORD  : [a-z][a-zA-Z0-9-]* | '__';

fragment DoubleStringCharacter       : ~["\r\n] | LineContinuation ;
fragment SingleStringCharacter       : ~['\r\n] | LineContinuation ;
fragment LineContinuation            : '\\' [\r\n\u2028\u2029] ;
fragment DecimalIntegerLiteral       : '0' | [1-9] [0-9]* ;
fragment ExponentPart                : [eE] [+-]? [0-9]+ ;

// WS : [ \t\r\n]+ -> skip ;
NL : '\r'? '\n';
WS : [ \t]+ -> skip ;

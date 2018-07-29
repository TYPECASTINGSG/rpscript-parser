grammar RPScript;

program
    : sourceElements? EOF
    ;

sourceElements
    : statement+
    ;

statement
    : pipeActions
    | singleAction
    | comment
    | NL;

statementList : statement+;

pipeActions : action PIPE action;
singleAction : action;
comment : COMMENT;

action : WORD paramList optList | '(' WORD paramList optList ')' ;

paramList : param*;
param : singleExpression | symbol | action;
// param : singleExpression | literal | variable | anonFn | symbol | action;

optList : opt*;
opt   : '--' optName ('='literal)?;

singleExpression :                                                                    
    literal                                               
    | shortFn                 
    | arrayLiteral  
    | variable                                  
    | action                       
    | objectLiteral;


shortFn : '(' (variable (',' variable)*)? ')' '=>' action;
// variable : VAR varParams? ( varFunction varParams? ) *;
variable : VAR;
varFunction : FUNCTION;
varParams    : '(' singleExpression* ')';
literal
    : NullLiteral | BooleanLiteral
    | StringLiteral | TemplateStringLiteral
    | DecimalLiteral | EnvVarLiteral;
symbol : SYMBOL;
    
optName : WORD ;
objectLiteral
    : '{' (propertyAssignment (',' propertyAssignment)*)? ','? '}';

arrayLiteral : '[' '\n'* elementList? '\n'* ']' '\n'* ;

elementList
    : singleExpression (','+ '\n'* singleExpression)* ;

propertyAssignment : propertyName ':' singleExpression;
propertyName : StringLiteral | DecimalLiteral | WORD | SYMBOL;
eos : EOF;



///////////////////  LEXER  /////////////////////

DIRECTIVE               : '@';
PIPE                    : '|';
EnvVarLiteral           : '$$' [0-9]+ ' '*;
VAR                     : [$][a-zA-Z0-9]+ ' '*;
FUNCTION                : [.][a-zA-Z0-9]+ ' '*;

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

NL : '\r'? '\n';

// WS : [ \t\r\n]+ -> skip ;
WS : [ \t]+ -> skip ;

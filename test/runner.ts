import fs from 'fs';
import c from 'chai';
import 'mocha';
import {Runner} from '../src/core/runner';


describe('Runner', () => {
  it('should get config and add to context', async () => {
    let runner = new Runner({});
    let ctx = runner.initRpsContext(`${process.cwd()}/test/fixtures`);

    c.expect(ctx.getModuleContext('unittest')).to.be.deep.equals({"config":{"port":9999,"email":"daisuke@endeworks.jp","services":{"twitter":{"class":"Hamaki::Service::Twitter","username":"CHANGEME","password":"CHANGEME"}},"filter":{"class":"Hamaki::Filter::Regexp","default":1,"on_match":0,"regexp_map":null}},"text":"(?:@radioyoutube|(?:CLAP|STAND)!) "});
    
  });
});
//   xit('should run', () => {
//     let runner = new Runner();
//     runner.run(process.cwd()+'/.rpscript/test.ts');

//     c.expect(false).to.be.true;
//   });

//   it('compile source code', async () => {
//     let runner = new Runner();

//     // let result = await runner.convertToTS('./test/fixtures/fn1.rps');
//     // result = await runner.linting('.rpscript/fn1.ts');
//     // result = await runner.run('.rpscript/fn1.ts');
//     if(fs.existsSync('.rpscript/simple.ts')) fs.unlinkSync('.rpscript/simple.ts');

//     let result = await runner.convertToTS('./test/fixtures/simple.rps');
//     let output = await runner.linting('.rpscript/simple.ts');
//     let run    = await runner.run('.rpscript/simple.ts');


//     c.expect(output.errorCount === 0).to.be.true;
//   });

// })

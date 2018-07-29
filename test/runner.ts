import fs from 'fs';
import c from 'chai';
import 'mocha';
import {Runner} from '../src/core/runner';


describe('Runner', () => {
  xit('should get config and add to context', async () => {
    let runner = new Runner({});
    let ctx = runner.initRpsContext(`${process.cwd()}/test/fixtures`,[]);

    c.expect(ctx.getModuleContext('unittest')).to.be.deep.equals({"config":{"port":9999,"email":"daisuke@endeworks.jp","services":{"twitter":{"class":"Hamaki::Service::Twitter","username":"CHANGEME","password":"CHANGEME"}},"filter":{"class":"Hamaki::Filter::Regexp","default":1,"on_match":0,"regexp_map":null}},"text":"(?:@radioyoutube|(?:CLAP|STAND)!) "});
    
  });
  
  it('should run generated temp file',async function () {
    let runner = new Runner({skipRun:true,skipKeywordCheck:true});
    runner.exeFromSource(__dirname+'/fixtures/basic/single-simple.rps.js');
  });

  it.only('should generate js', async function() {
    let runner = new Runner({skipRun:true,skipKeywordCheck:true});
    let testpath = './test/fixtures/basic/';
    // let filesToTest = [
    //   `${testpath}string.rps`,`${testpath}pipeline-simple.rps`,
    //   `${testpath}single-2-actions.rps`,`${testpath}single-dash.rps`,`${testpath}single-multiline.rps`,
    //   `${testpath}single-simple.rps`,`${testpath}single-var.rps`,`${testpath}symbol-simple.rps`];

      let filesToTest = [`${testpath}array.rps`]
    
    for(var i =0 ;i<filesToTest.length;i++){
      if(fs.existsSync(filesToTest[i]+'.js'))fs.unlinkSync(filesToTest[i]+'.js');
    }

    runner.on('runner.transpile.err', async function (err) {
      console.error('*** TRANSPILE ERROR ***');
      console.error(err);
    })

    for(var i =0 ;i<filesToTest.length;i++){
      try{
      let content = await runner.execute(filesToTest[i],[1,2,3]);
      fs.writeFileSync(filesToTest[i]+'.js',content.transpile.fullContent);

      }catch(err){
        console.log('*** '+filesToTest[i]+' ***')
        console.error(err);
      }
    }
  });
});



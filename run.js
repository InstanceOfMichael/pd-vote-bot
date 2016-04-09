require('dotenv').load();
const superagent = require('superagent');
const random_useragent = require('random-useragent');
const sscanf = require('scanf').sscanf;
const UA = random_useragent.getRandom();
const trimWith = require('trim-with');
const moment = require('moment');
// what is 1460216838816 ?l
 
const trimQuotes = function(text)
{
    // console.log(text.split(''));
    const toTrimMap = {
        '"':1,
        "'":1,
    };
    const result = trimWith(text.split(''), function(element) {
      // removes falsy values from sides
      // console.log(element);
      return !element || toTrimMap[element];
    }).join('');

    return result;
}

const domain = 'p'+'o'+'l'+'l'+'d'+'a'+'d'+'d'+'y'+'.com';
const agent = superagent.agent();
const poll_id = process.env.POLL_ID;
const referer_href = process.env.REFERER_HREF;
const PDV_h = process.env.PDV_H; 
const answer_id = process.env.ANSWER_ID;

if (!poll_id) throw new Error('invalid poll_id');
if (!referer_href) throw new Error('invalid referer_href');
if (!PDV_h) throw new Error('invalid PDV_h');
if (!answer_id) throw new Error('invalid answer_id');

const getRightToVoteHttp = function()
{
    // miliseconds since 1970~
    const now_ms = moment().valueOf();
    // cool unlabled variable
    return new Promise(function(resolve,reject)
    {
        const href = 'http://'+domain+'/n/'+PDV_h+'/'+poll_id+'?'+now_ms;

        agent
             // 'http://'+domain+'.com/n/9f57282427035039957401a1060d86fc/9376800?1460220152725'
           .get(href)
           // http => https (with cookie set) THEN there is a res.body
           .redirects(1)
           .buffer(true) // force res.text to not be parsed by content type
           .set({
                'pragma':'no-cache',
                'accept-encoding':'gzip, deflate, sdch',
                'accept-language':'en-US,en;q=0.8',
                'user-agent':UA,
                // 'User-Agent': UA,
                'accept':'*/*',
                'cache-control':'no-cache',
                'authority':domain,
                'referer':referer_href,
            })
           .end(function(err, res)
           {
                // console.log('---RES:');
                // console.log(res);
                // console.log(Object.keys(res));
                // console.log('---/RES:');
                // console.log('---ERR:');
                // console.log(err);
                // console.log('---/ERR:');
                // return;
                if (err || !res.ok)
                {
                    console.error(err||res);
                    return reject(err||res);
                }

                // const body = "PDV_n9376800='0ca97f461d|1101';PD_vote9376800(0);";
                const body = res.text;
                const pattern = '%s=%s;%s(%s);';
                console.log({
                    body:body,
                    pattern:pattern,
                })
                const scanResult = sscanf(body,pattern).map(text => trimQuotes((text||'').trim()).trim());
                const data = {
                    n_key     : scanResult[0],
                    n_value   : scanResult[1],
                    fn_name   : scanResult[2],
                    fn_param1 : scanResult[3],
                    now_ms    : now_ms,
                    referer_href:referer_href,
                    poll_id:poll_id,
                    answer_id:answer_id,
                };

                console.log(data);

                return resolve(data);
           });
    });
}

const placeVoteHttp = function(data)
{
    return new Promise(function(resolve,reject)
    {
        const href = 'http://polls.'+domain+'/vote-js.php';
        const query = {
            p:data.poll_id,
            b:'1',
            a:data.answer_id,
            o:'',
            va:'16',
            cookie:'0', // 1 means that the cookie for "ALREADY VOTED" was voted
            n:data.n_value,
            url:data.referer_href,
        };
        agent
           //  'curl 'http://polls.'+domain+'.com/vote-js.php?
           //           p=9376800
           //          &b=1
           //          &a=42759828,
           //          &o=
           //          &va=16
           //          &cookie=1
           //          &n=34d4cbd283|415
           //          &url=http%3A//www.al.com/entertainment/index.ssf/2016/04/whistlestop_2016_vote_to_deter.html'
           .get(href)
           .buffer(true) // force res.text to not be parsed by content type
           .set({
                'pragma':'no-cache',
                'accept-encoding':'gzip, deflate, sdch',
                'accept-language':'en-US,en;q=0.8',
                'user-agent':UA,
                // 'User-Agent': UA,
                'accept':'*/*',
                'cache-control':'no-cache',
                'authority':domain,
                'referer':'http://www.al.com/entertainment/index.ssf/2016/04/whistlestop_2016_vote_to_deter.html',
            })
           .query(query)
           .end(function(err, res)
           {
                if (err || !res.ok)
                {
                    console.error(err||res);
                    return reject(err||res);
                }

                if (res.text.indexOf('Thank you for voting!') > -1)
                {
                    return reject('Thank you for voting!');
                }
                //'Thank you for voting!'

                if (res.text.indexOf('we have already counted your vote') > -1)
                {
                    return reject('we have already counted your vote');
                }

                return resolve(err||res);
           });

    });
}

const dump = function(msg)
{
    console.log('----DUMPING:');
    console.log(msg);
}

getRightToVoteHttp()
    .then(placeVoteHttp,dump)
    .then(result => console.log({
        result:result,
    }),dump)
    .then(dump,dump)
    .then(function(){
        // console.log(agent);
    })
    ;


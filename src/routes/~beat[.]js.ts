import { createFileRoute } from "@tanstack/react-router";

// Beacon interno mascarado ('/~beat.js') — evita colisão com nome de SDKs
// conhecidos (ex.: Tinybird flock.js) que extensões do navegador interceptam.
const SCRIPT = `(function(){
  var q=window.__beat=window.__beat||[];
  function send(e){
    try{
      var b=JSON.stringify({e:e,t:Date.now(),u:location.href,r:document.referrer||""});
      if(navigator.sendBeacon){navigator.sendBeacon("/~api/beat",b);}
      else{fetch("/~api/beat",{method:"POST",headers:{"Content-Type":"application/json"},body:b,keepalive:true}).catch(function(){});}
    }catch(_){}
  }
  window.beat=function(){send({name:arguments[0],args:[].slice.call(arguments,1)});};
  for(var i=0;i<q.length;i++){window.beat.apply(null,q[i]);}
})();`;

export const Route = createFileRoute("/~beat.js")({
  server: {
    handlers: {
      GET: async () =>
        new Response(SCRIPT, {
          status: 200,
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});

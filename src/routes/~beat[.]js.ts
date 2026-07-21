import { createFileRoute } from "@tanstack/react-router";

// Proxy reverso anti-AdBlock: '/~flock.js' serve um beacon mínimo
// (sem nomes "analytics/pixel/track") que encaminha eventos via /~api/analytics.
const SCRIPT = `(function(){
  var q=window.__flock=window.__flock||[];
  function send(e){
    try{
      var b=JSON.stringify({e:e,t:Date.now(),u:location.href,r:document.referrer||""});
      if(navigator.sendBeacon){navigator.sendBeacon("/~api/analytics",b);}
      else{fetch("/~api/analytics",{method:"POST",headers:{"Content-Type":"application/json"},body:b,keepalive:true}).catch(function(){});}
    }catch(_){}
  }
  window.flock=function(){send({name:arguments[0],args:[].slice.call(arguments,1)});};
  for(var i=0;i<q.length;i++){window.flock.apply(null,q[i]);}
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

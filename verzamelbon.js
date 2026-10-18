// ====================================================================================
// X65P · VERZAMELBON (18-10-2026)
// Eén bon (bijv. een schermafbeelding van het Uber-account) in één keer koppelen aan
// alle openstaande bankregels met dezelfde naam.
//
// Dit bestand hoort naast bank.html te staan en wordt NA de app geladen:
//   <script src="verzamelbon.js"></script>   (vlak boven </body> in bank.html)
// Het gebruikt de functies van bank.html en vervangt er een paar door een uitgebreide versie.
//
// Hoe het werkt:
// - Sla je een bon op en koppel je hem aan een bankregel (bijv. via 🖥 Screenshot), en staan er
//   nog meer open regels met dezelfde naam? Dan vraagt de app meteen: "Ook aan deze regels koppelen?"
// - Bij een regel die al een bon heeft staat ook de knop "🔗 Ook aan andere regels koppelen".
// - De bon wordt dan een verzamelbon: hij telt als compleet (geen "deels gekoppeld", geen fooi),
//   en de btw van de bon (bijv. 0%) geldt voor alle gekoppelde regels.
// - Per regel terugdraaien kan met "↩ Ongedaan maken", zoals altijd.
// ====================================================================================
(function(){
  if(typeof renderPaneel!=='function'||typeof bonOpslaan!=='function'){
    console.error('verzamelbon.js: bank.html is niet (goed) geladen');return;
  }
  var VB_VERSIE='verzamelbon 18-10';

  // Versie zichtbaar maken naast het versienummer van de app.
  try{
    var v=document.querySelector('[title="Versie van deze pagina"]');
    if(v) v.textContent=v.textContent+' + '+VB_VERSIE;
  }catch(e){}

  // ---------- Welke regels horen erbij? ----------
  var OPEN=['open','twijfel','opvragen'];
  function eersteWoord(k){return (k||'').split(' ')[0]||'';}
  // Alle open afschrijvingen met (bijna) dezelfde naam, in alle maanden en op alle rekeningen.
  // aan = vooraf aangevinkt (precies dezelfde naam). Bijv. bij "Uber trip" staat "Uber Eats" er wel bij, maar uit.
  function verzamelKandidaten(t){
    var k=naamSleutel(t.omschrijving),w=eersteWoord(k);
    var hk=herkend(t),alias=hk&&hk.bron==='eigen'?hk.naam:null;
    if(!k&&!alias) return [];
    var uit=[];
    transacties.forEach(function(x){
      if(x.id===t.id||x.type!=='af'||OPEN.indexOf(txStatus(x))<0) return;
      var kx=naamSleutel(x.omschrijving),hx=herkend(x);
      var zelfde=(k&&kx===k)||(alias&&hx&&hx.bron==='eigen'&&hx.naam===alias);
      var lijkt=w.length>=3&&eersteWoord(kx)===w;
      if(zelfde||lijkt) uit.push({tx:x,aan:!!zelfde});
    });
    uit.sort(function(a,b){return (parseDatumNL(a.tx.datum)||0)-(parseDatumNL(b.tx.datum)||0);});
    return uit;
  }
  function btwTekst(b){var p=btwPctVan(b);return p!=null?p+'% btw':'btw zoals op de bon';}

  // ---------- Venster: kiezen en koppelen ----------
  function toonVerzamelModal(t,b,naOpslaan){
    var lijst=verzamelKandidaten(t);
    if(!lijst.length){
      if(!naOpslaan){zetMelding('Er staan geen andere open regels met deze naam.','info');render();}
      return false;
    }
    var naam=(herkend(t)||{}).naam||kortOms(t.omschrijving);
    var nAan=lijst.filter(function(x){return x.aan;}).length;
    var h='<div class="modal-box"><h3>🔗 Ook aan andere regels koppelen?</h3>'+
      '<p class="klein" style="margin-bottom:8px">'+(naOpslaan?'✓ De bon is bewaard en gekoppeld. ':'')+
      'Er staan nog <b>'+lijst.length+'</b> open regel'+(lijst.length!==1?'s':'')+' van <b>'+esc(naam)+'</b>. '+
      'Vink aan welke dezelfde bon krijgen.</p>'+
      '<div class="melding info" style="margin-bottom:8px">🧾 '+esc(b.omschrijving||'—')+' · '+esc(b.categorie||'')+' · '+esc(btwTekst(b))+'</div>'+
      '<label class="klein" style="display:flex;gap:6px;align-items:center;cursor:pointer;margin-bottom:6px"><input type="checkbox" id="vb-alles" style="width:auto"'+(nAan===lijst.length?' checked':'')+'> Alles aan / uit</label>'+
      '<div style="max-height:320px;overflow-y:auto;border:1px solid var(--lijn);border-radius:9px">';
    lijst.forEach(function(x){
      var tx=x.tx;
      h+='<label style="display:flex;gap:9px;align-items:center;padding:8px 10px;border-bottom:1px solid #f2f2f4;cursor:pointer">'+
        '<input type="checkbox" class="vb-vink" value="'+esc(tx.id)+'" style="width:auto"'+(x.aan?' checked':'')+'>'+
        '<span style="flex:1;min-width:0"><span class="rij-datum">'+esc(rijDatum(tx.datum))+' '+((parseDatumNL(tx.datum)||{getFullYear:function(){return '';}}).getFullYear())+'</span>'+
        ' <span class="klein">· '+esc(rekKortT(tx))+'</span><br><span class="klein">'+esc(kortOms(tx.omschrijving))+'</span></span>'+
        '<span class="bedrag af">'+fmt(tx.bedrag)+'</span></label>';
    });
    h+='</div>'+
      '<div class="balk" style="margin-top:14px"><button class="knop" id="vb-ok" data-vb="koppel" data-tx="'+esc(t.id)+'" data-bon="'+esc(b.id)+'">Koppel aan '+nAan+' regel'+(nAan!==1?'s':'')+'</button>'+
      '<button class="knop licht" data-act="modal-dicht">'+(naOpslaan?'Nee, alleen deze':'Annuleren')+'</button></div></div>';
    toonModal(h);
    return true;
  }
  function telVinkjes(){
    var vink=document.querySelectorAll('.vb-vink'),n=0;
    for(var i=0;i<vink.length;i++) if(vink[i].checked) n++;
    var ok=document.getElementById('vb-ok');
    if(ok){ok.textContent='Koppel aan '+n+' regel'+(n!==1?'s':'');ok.disabled=!n;}
    var alles=document.getElementById('vb-alles');
    if(alles) alles.checked=n===vink.length;
  }
  function koppelGekozen(bonId){
    var b=bonMap[bonId];if(!b) return;
    var vink=document.querySelectorAll('.vb-vink'),n=0;
    for(var i=0;i<vink.length;i++){
      if(!vink[i].checked) continue;
      var t=txMap[vink[i].value];
      if(!t||t.type!=='af'||OPEN.indexOf(txStatus(t))<0) continue;
      koppel(t,b);n++;
    }
    sluitModal();
    if(!n) return;
    if(!b.verzamelbon){b.verzamelbon=true;stempel(b);}
    zetMelding('✓ "'+(b.omschrijving||'bon')+'" gekoppeld aan nog '+n+' regel'+(n!==1?'s':'')+' ('+btwTekst(b)+'). Terugdraaien kan per regel met ↩ Ongedaan maken.','ok');
    naWijziging(true,true);
  }

  // ---------- Klikken ----------
  document.addEventListener('click',function(e){
    var el=e.target.closest&&e.target.closest('[data-vb]');
    if(!el) return;
    e.preventDefault();
    var wat=el.getAttribute('data-vb');
    if(wat==='open'){
      var t=txMap[el.getAttribute('data-tx')],b=t&&bonMap[matchesByTxId[t.id]];
      if(t&&b) toonVerzamelModal(t,b,false);
    } else if(wat==='koppel'){
      koppelGekozen(el.getAttribute('data-bon'));
    }
  });
  document.addEventListener('change',function(e){
    if(e.target.id==='vb-alles'){
      var vink=document.querySelectorAll('.vb-vink');
      for(var i=0;i<vink.length;i++) vink[i].checked=e.target.checked;
      telVinkjes();
    } else if(e.target.classList&&e.target.classList.contains('vb-vink')) telVinkjes();
  });

  // ---------- Uitbreidingen op de app ----------
  // 1. Na "Opslaan en koppelen": staan er meer open regels met dezelfde naam? Dan meteen vragen.
  var _bonOpslaan=bonOpslaan;
  bonOpslaan=function(){
    var ctx=bonFormCtx||{},txId=ctx.txId;
    _bonOpslaan.apply(this,arguments);
    if(!txId||ctx.bonId) return;
    var t=txMap[txId],b=t&&bonMap[matchesByTxId[t.id]];
    if(t&&b&&!$('modal').innerHTML) toonVerzamelModal(t,b,true);
  };
  // 2. Knop in een regel die al een bon heeft.
  var _renderPaneel=renderPaneel;
  renderPaneel=function(t,paren){
    var h=_renderPaneel.apply(this,arguments);
    if(txStatus(t)!=='bon'||t.type!=='af') return h;
    var n=verzamelKandidaten(t).length;
    if(!n) return h;
    var knopHtml='<div class="acties" style="margin-top:8px"><button class="knopje" data-vb="open" data-tx="'+esc(t.id)+'">🔗 Ook aan '+n+' andere regel'+(n!==1?'s':'')+' met deze naam koppelen</button></div>';
    var p=h.lastIndexOf('</div>');
    return p>=0?h.slice(0,p)+knopHtml+h.slice(p):h+knopHtml;
  };
  // 3. Een verzamelbon is altijd compleet en heeft nooit fooi.
  var _isVolledigGematcht=isVolledigGematcht;
  isVolledigGematcht=function(bon){
    if(bon&&bon.verzamelbon&&(matchesByBonId[bon.id]||[]).length) return true;
    return _isVolledigGematcht.apply(this,arguments);
  };
  var _fooiBedrag=fooiBedrag;
  fooiBedrag=function(bon){
    if(bon&&bon.verzamelbon) return 0;
    return _fooiBedrag.apply(this,arguments);
  };
  // 4. In het Excel-overzicht: bij een verzamelbon per regel de btw uitrekenen (bijv. 0%) en
  //    het bonbedrag gelijk aan de afschrijving, zodat de boekhouder geen verschil ziet.
  var _maakWerkboek=maakWerkboek;
  maakWerkboek=function(XLSX,txs,losse,bestanden){
    var wb=_maakWerkboek.apply(this,arguments);
    try{
      var ws=wb.Sheets['Bankregels'];if(!ws) return wb;
      txs.forEach(function(t,i){
        if(txStatus(t)!=='bon') return;
        var b=bonMap[matchesByTxId[t.id]];if(!b||!b.verzamelbon) return;
        var pct=btwPctVan(b);if(pct==null) pct=0;
        var r=i+1;
        ws[XLSX.utils.encode_cell({r:r,c:7})]={t:'n',v:btwUitPct(t.bedrag,pct),z:'€ #,##0.00'};
        ws[XLSX.utils.encode_cell({r:r,c:9})]={t:'n',v:t.bedrag,z:'€ #,##0.00'};
        var oc=XLSX.utils.encode_cell({r:r,c:11}),oud=(ws[oc]&&ws[oc].v)||'';
        ws[oc]={t:'s',v:[oud,'verzamelbon ('+pct+'% btw)'].filter(Boolean).join(' · ')};
      });
    }catch(e){console.error('verzamelbon Excel',e);}
    return wb;
  };
})();

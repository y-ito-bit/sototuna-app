/* マイタグの選択肢。プロフィールには "取組" か "取組:中身" の id で保存する（例 "pbl:sumoto"）。
   出典と経緯は docs/research-policy-programs-tags.md。選択肢を足すときは、既存の id を変えずに末尾へ追加する。 */
(function () {
 const item=(id,label,aliases=[],section='')=>({id,label,aliases,section});
 const now='いまの先生', past='以前の先生', unsure='ゼミ未確認の先生';
 const teachers=[
  item('abe','阿部 大輔',[],now),item('an','安 周永',[],now),item('ishikura','石倉 研',[],now),item('ishihara','石原 凌河',[],now),
  item('inoue','井上 芳恵',[],now),item('imasato','今里 佳奈子',[],now),item('oishi','大石 尚子',[],now),item('oshima','大島 堅一',[],now),
  item('ota','大田 直史',['太田'],now),item('okuno','奥野 恒久',[],now),item('kim','金 紅実',[],now),item('shimizu','清水 万由子',[],now),
  item('takahata','高畑 重勝',[],now),item('tadatomo','只友 景士',[],now),item('tanigaki','谷垣 岳人',[],now),item('nakamori','中森 孝文',[],now),
  item('najima','南島 和久',[],now),item('hattori','服部 圭郎',[],now),item('fukao','深尾 昌峰',[],now),item('matsuura','松浦 さと子',[],now),
  item('matsuda','松田 繁樹',[],now),item('matoba','的場 信敬',[],now),item('murata_kazu','村田 和代',[],now),item('yoshimoto','吉本 圭佑',[],now),
  item('usui','碓井 智子',[],unsure),item('uchida','内田 恭彦',[],unsure),item('j_sakurai','櫻井 次郎',[],unsure),item('namiki','並木 州太朗',[],unsure),
  item('funada','船田 智史',[],unsure),item('mibu','壬生 泰紀',[],unsure),item('yuasa','湯浅 孝康',[],unsure),item('yonekura','米倉 みどり',[],unsure),
  item('aoyama','青山 公三',[],past),item('ishida','石田 徹',[],past),item('oyano','大矢野 修',[],past),item('kitagawa','北川 秀樹',[],past),
  item('sakamoto','坂本 勝',[],past),item('shiraishi','白石 克孝',[],past),item('shirasu','白須 正',[],past),item('jitosho','地頭所 里紗',[],past),
  item('tsuchiyama','土山 希美枝',[],past),item('tomino','富野 暉一郎',[],past),item('nakamura','中村 剛治郎',[],past),item('matsuoka','松岡 信哉',[],past),
  item('murata_ken','村田 健三郎',[],past),item('yahagi','矢作 弘',[],past),
 ];
 const groups=[
  {id:'zemi',label:'ゼミ',aliases:['演習','ゼミナール'],multi:false,pick:'先生',items:teachers},
  {id:'gap',label:'Ryu-SEI GAP',aliases:['GAP','Ryu SEI GAP','Ryu-Sei GAP','グローカルアクションプログラム'],multi:true,pick:'チーム',items:[
   item('manasapo','まなサポ+1',['学習支援'],'2011〜2020'),item('wasshoi','伏見わっしょい新党',[],'2011〜2020'),item('tsutamaru','TSUTAまーる',[],'2011〜2020'),
   item('tekuteku','てくてく伏見',['まちあるき'],'2011〜2020'),item('la','Local Activities（LA）',['LA','ローカルアクティビティーズ'],'2011〜2020'),
   item('animamoru','あにまもる。',[],'2011〜2020'),item('toenkai','桃園会',[],'2011〜2020'),item('gokkun','Gokkun伏見',[],'2011〜2020'),
   item('projectf','PROJECT.F',[],'2011〜2020'),item('housemile','はうすまいる',[],'2011〜2020'),item('morimori','もりもり☆キッズ',[],'2011〜2020'),
   item('animalhugger','animal hugger',[],'2011〜2020'),item('kokodake','ここだけのパレット',[],'2011〜2020'),item('mottainai','MOTTAINAI ZERO同盟',[],'2011〜2020'),
   item('clear','Clear',[],'2011〜2020'),item('terakoya','寺子屋',[],'2011〜2020'),item('kyopro','きょうだい児プロジェクト',['きょうプ'],'2011〜2020'),
   item('ryuhuku','RYUHUKu',[],'2011〜2020'),
   item('miraibu','みらい部',[],'2021〜'),item('chuta','CHUTA',[],'2021〜'),item('bambino','bambino',[],'2021〜'),item('reconect','Re:conect',[],'2021〜'),
   item('spots','SPOTs',[],'2021〜'),item('smile','Smile↑↑↑',['smile'],'2021〜'),item('parkers','パーカーズ',['Parkers'],'2021〜'),
   item('sababu','サバブヤクイシ',[],'2021〜'),item('musubito','むすびと、',[],'2021〜'),item('breakers','BREAKERS',[],'2021〜'),item('rise','RISE',[],'2021〜'),
   item('mukamin','むかみん',[],'2021〜'),item('fushimichi','ふしみち',[],'2021〜'),item('fighters','Fighters',[],'2021〜'),item('jimotto','じもっと',[],'2021〜'),
   item('terakoyan','てらこや〜ん',[],'2021〜'),item('ecobell','エコベル',[],'2021〜'),item('furatto','ふらっと',[],'2021〜'),item('crayseed','くれいしーど',[],'2021〜'),
   item('unknown','チーム名がわからない',[],'その他'),
  ]},
  {id:'ibesta',label:'イベスタ',aliases:['イベントスタッフ','政策学部イベントスタッフ'],multi:true,pick:'課',items:[
   item('kikaku','企画課'),item('koho','広報課'),item('oc','OC課',['オープンキャンパス課']),
  ]},
  {id:'pbl',label:'PBL・CBL',aliases:['PBL','CBL','政策実践・探究演習','政策実践・探求演習','プロジェクト','PJ'],multi:true,pick:'プロジェクト',items:[
   item('sumoto','洲本PJ',['洲本','PBL in洲本','洲本プロジェクト'],'国内PBL'),item('fukuchiyama','福知山PJ',['福知山'],'国内PBL'),
   item('moriyama','守山PJ',['守山'],'国内PBL'),item('fukuchiyama_moriyama','福知山・守山PJ',['福知山','守山'],'国内PBL'),
   item('hanashiai','「話し合い」創造PJ',['話し合いPJ','守山','京丹後'],'国内PBL'),item('kyotango_ikaga','京丹後PJ（五十河）',['京丹後','五十河'],'国内PBL'),
   item('kyotango_bousai','京丹後・防災PJ',['京丹後','防災'],'国内PBL'),item('kyotango_mie','京丹後三重・森本PJ',['京丹後','三重','森本'],'国内PBL'),
   item('kameoka','亀岡PJ',['亀岡'],'国内PBL'),item('kameoka_nantan','亀岡・南丹PJ',['亀岡','南丹'],'国内PBL'),item('nantan','南丹PJ',['南丹'],'国内PBL'),
   item('fukakusa_sho','深草小学校PJ',['伏見','深草'],'国内PBL'),item('fureai','伏見ふれあいプラザPJ',['伏見'],'国内PBL'),
   item('touhyou','伏見区投票率向上PJ',['伏見','センキョ'],'国内PBL'),item('fushimi_fukakusa','伏見深草PJ',['伏見','深草'],'国内PBL'),
   item('dortmund','ドルトムント',['ドイツ'],'海外PBL・国際CBL'),item('nanjing','南京',['中国'],'海外PBL・国際CBL'),
   item('portland','ポートランド',['アメリカ','国際CBL'],'海外PBL・国際CBL'),item('finland','フィンランド',['ラハティ'],'海外PBL・国際CBL'),
   item('italy','イタリア',['トリノ'],'海外PBL・国際CBL'),item('taiwan','台湾',[],'海外PBL・国際CBL'),item('korea','韓国',['ソウル'],'海外PBL・国際CBL'),
   item('fushimi_cbl','伏見CBL演習',['伏見CBL'],'CBL・入門の授業'),item('chiiki_kadai','地域課題発見演習',['竹林'],'CBL・入門の授業'),
   item('glocal','グローカル戦略実践演習',[],'CBL・入門の授業'),item('csr','企業のCSR実践演習',['CSR'],'CBL・入門の授業'),
   item('pbl_nyumon','PBL入門・新PBL入門',['いなか留学','地域デビュー'],'CBL・入門の授業'),
  ]},
  {id:'clasapo',label:'クラサポ',aliases:['クラスサポーター','クラスサポーター委員会'],multi:true,pick:'担当した先生',
   items:[...teachers,item('okamoto','岡本 健資',[],past)]},
  {id:'zemiren',label:'ゼミ連・討論会',aliases:['ゼミ連','政ゼミ連','政策学部ゼミナール連合会','ゼミ討論会','演習合同討論会'],multi:false,items:[]},
 ];
 const byId=new Map(groups.map(g=>[g.id,g]));
 function parts(tag){const [g,i]=String(tag).split(':');const group=byId.get(g);return {group,item:group&&i?group.items.find(x=>x.id===i):null};}
 // 表示名（例「PBL・CBL／洲本PJ」）。選択肢から消えた id は表示しない。
 function label(tag){const {group,item}=parts(tag);if(!group)return '';return item?`${group.label}／${item.label}`:group.label;}
 // 検索語がタグの名前・別名に含まれるか（ありがとうの森のタグ検索で使う）。
 function matches(tag,query){
  const q=String(query||'').trim().toLowerCase();if(!q)return true;const {group,item}=parts(tag);if(!group)return false;
  return [group.label,...group.aliases,...(item?[item.label,...item.aliases]:[])].some(w=>w.toLowerCase().includes(q));
 }
 window.SototunaTags={groups,label,matches};
})();

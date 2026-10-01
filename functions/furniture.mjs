// Free reusable basics: creative tools never require luck or tokens.
export const FURNITURE=[
 {id:'furniture-shelf',name:'三層開放展示架',surface:'floor'},
 {id:'furniture-steps',name:'階梯展示台',surface:'floor'},
 {id:'furniture-desk',name:'木作工作桌',surface:'floor'},
 {id:'furniture-chair',name:'圓角小椅',surface:'floor'},
 {id:'furniture-counter',name:'展示小櫃台',surface:'floor'},
 {id:'furniture-divider',name:'拱形空間隔板',surface:'floor'},
 {id:'furniture-lamp',name:'閱讀立燈',surface:'floor'},
 {id:'furniture-wall-shelf',name:'雙層牆面架',surface:'wall'},
 {id:'furniture-frame',name:'幾何畫框',surface:'wall'},
 {id:'furniture-path',name:'拼接木步道',surface:'floor'},
 {id:'furniture-planter',name:'長形綠植箱',surface:'floor'},
 {id:'furniture-sign',name:'小小展示牌',surface:'floor'}
];

const sizes={shelf:[1.05,1.15,.38],steps:[1.02,.6,.55],desk:[1.2,.72,.68],chair:[.42,.9,.42],counter:[1.3,.83,.58],divider:[1.05,1.73,.4],lamp:[.6,1.5,.6],'wall-shelf':[.85,.5,.3],frame:[.62,.75,.06],path:[.6,.08,.68],planter:[.85,.8,.3],sign:[.45,.6,.2]};
for(const f of FURNITURE){f.size=sizes[f.id.replace('furniture-','')];f.series='basics';f.solid=['desk','counter','shelf','chair','divider'].includes(f.id.replace('furniture-',''));const surfaces={desk:[.72],chair:[.435],counter:[.83],shelf:[1.095]};if(surfaces[f.id.replace('furniture-','')])f.supports=surfaces[f.id.replace('furniture-','')]}
for(const [key,name,series,size,supports,surface]of [
 ['sofa','織布雙人沙發','sun',[1.65,.95,.8],[.43]],['armchair','弧背閱讀單椅','sun',[.76,.9,.78],[.42]],['coffee','橢圓木作茶几','sun',[1.05,.43,.62],[.43]],['bookcase','藤編高書櫃','sun',[.95,1.65,.36],[1.65]],['writing','抽屜閱讀書桌','sun',[1.3,.8,.62],[.8]],['ottoman','縫線圓腳凳','sun',[.5,.36,.5],[.36]],['books','書本與書擋','sun',[.35,.29,.2],null],['vase','陶瓶枝葉組','sun',[.28,.48,.28],null],
 ['daybed','星夜軟墊臥榻','night',[1.75,.8,.86],[.45]],['glasscase','燈框收藏展示櫃','night',[1.0,1.5,.42],[1.5]],['modular','方格模組層架','night',[1.3,1.2,.35],[1.2]],['console','唱片收納矮櫃','night',[1.4,.65,.42],[.65]],['piano','迷你電子琴','night',[.85,.18,.3],null],['record','復古唱片機','night',[.42,.18,.32],null],['clock','軌道壁鐘','night',[.44,.44,.07],null,'wall'],['cushion','星紋靠枕','night',[.35,.25,.16],null]
])FURNITURE.push({id:'furniture-'+key,name,series,size,supports,surface:surface||'floor',solid:!!supports});
export const FURNITURE_SERIES={basics:'基礎工作坊',sun:'日光閱讀室',night:'星夜創作室'};

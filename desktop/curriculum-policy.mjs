// Teaching scope chosen by the project owner: grades 3–9, Taiwanese first.
const otherLanguages=['客語文','原住民族語文','閩東語文','臺灣手語','新住民語文'];
const transversal=/^(應用科學思考的習慣|科學探究的興趣（|認識科學本質（|分析與發現（|討論與傳達（|計畫與執行（|觀察與定題（|批判與思辨（|想像與創造（|建立模型（|推理與論證（|健康知識的認知（|健康技能的概念（|運動知識的認知（|運動策略的概念（|健康的態度（|體育的態度（|自我價值（|運動欣賞（|健康技能（|生活技能（|運動技術操作（|運動策略運用（|健康的自我管理（|健康的倡議（|運動資源與計畫（|規律運動的實踐（|藝術的表現（|藝術的鑑賞（|藝術的實踐（)/;
export function curriculumRole(topic){
 if(otherLanguages.some(s=>topic.subject.includes(s)))return 'outside-selected-language';
 if(topic.status==='needs-language-scope'||/本土語文.*學習階段能力/.test(topic.name))return 'language-material-gap';
 return transversal.test(topic.name)?'cross-unit-competency':'teaching-unit';
}
export function curriculumDemand(topic,target){
 const role=curriculumRole(topic);
 return {role,target:role==='teaching-unit'?target:0,requiresContent:role==='teaching-unit'||role==='language-material-gap'};
}

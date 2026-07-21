'use strict';
const transitions=Object.freeze({intake:['screened'],screened:['classified','blocked'],classified:['documents_ready'],documents_ready:['review_pending'],review_pending:['approved','rejected'],rejected:['classified'],approved:['filed'],blocked:[],filed:[]});
function validateTradeCase(input){const errors=[];
 if(!Array.isArray(input.goods)||input.goods.length===0)errors.push('goods are required');
 for(const [i,g] of (input.goods||[]).entries()){if(!/^\d{6,10}$/.test(g.hsCode||''))errors.push(`goods[${i}].hsCode must contain 6-10 digits`);if(!g.description)errors.push(`goods[${i}].description is required`);if(!/^[A-Z]{2}$/.test(g.originCountry||''))errors.push(`goods[${i}].originCountry must be ISO-2`);if(!/^[A-Z]{2}$/.test(g.destinationCountry||''))errors.push(`goods[${i}].destinationCountry must be ISO-2`);}
 if(!Array.isArray(input.parties)||input.parties.length<2)errors.push('shipper and consignee parties are required');
 for(const [i,p] of (input.parties||[]).entries())if(!p.name||!p.country||!p.externalId)errors.push(`parties[${i}] requires name, country, and externalId`);
 const tariff=input.tariffSnapshot||{};if(!tariff.source||!tariff.version||Number.isNaN(Date.parse(tariff.effectiveAt||'')))errors.push('versioned tariffSnapshot is required');
 if(!Array.isArray(input.screenings)||input.screenings.length===0)errors.push('at least one sanctions screening result is required');
 for(const [i,s] of (input.screenings||[]).entries())if(!s.source||!s.listVersion||typeof s.matched!=='boolean'||Number.isNaN(Date.parse(s.screenedAt||'')))errors.push(`screenings[${i}] is incomplete`);
 if(!Array.isArray(input.requiredDocuments))errors.push('requiredDocuments must be an array');return{valid:errors.length===0,errors};}
function controls(input){const matches=(input.screenings||[]).filter(x=>x.matched);const licenses=(input.goods||[]).filter(x=>x.licenseRequired);return{blocked:matches.length>0,sanctionsMatches:matches.map(x=>x.partyExternalId),licenseRequiredFor:licenses.map(x=>x.hsCode),documentCount:(input.requiredDocuments||[]).length,ruleEffectiveAt:input.tariffSnapshot?.effectiveAt||null};}
function assertTransition(from,to,actor,record){if(!(transitions[from]||[]).includes(to))throw new Error(`transition ${from} -> ${to} is not allowed`);if(['approved','filed'].includes(to)){if(!['trade_reviewer','compliance_officer','manager','admin'].includes(actor.role))throw new Error('trade compliance reviewer role required');if(String(actor.id)===String(record.created_by))throw new Error('classifier cannot approve or file their own case');}if(to==='approved'&&record.controls?.blocked)throw new Error('sanctions match blocks approval');}
module.exports={validateTradeCase,controls,assertTransition};


//import { Op, QueryTypes } from "sequelize";
//import RedisUtil from "../utils/redis";
//import { HttpError } from "../utils/HttpError";
const axios = require('axios');
import * as XLSX from 'xlsx';


export const extractRXCUI = async (data,file) => {

  try {
    const drug_name='DRUG_NAME';
    const atc_class='ATC_CLASS';
    let drugList=[];
    let atcClass;
    // if(data.atcClass && data.atcClass == null)
    // {
    //     throw Error("Please provide atc class to continue the process");
    // }

    // if(data.fromString && data.drugList == null)
    // {
    //     throw Error("Please provide drug list to continue the process");
    // }

    if(file != null)
    {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if(sheetName.toLowerCase()!='input')
        {
            throw Error();
        }
        const sheet = workbook.Sheets[sheetName.toString()];
        let sheetdata = XLSX.utils.sheet_to_json(sheet);
        drugList=sheetdata.map(x=>x[drug_name]);
        atcClass=sheetdata[0][atc_class];
    }
    
    let obj;
    if(atcClass)
    {
       obj= extractRxCUIFromATC(atcClass,drugList);
    }
    return obj;
    
      
  } catch (error) {

  }
};

const extractRxCUIFromATC = async (atcClass,drugList) => {

    try{
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://rxnav.nlm.nih.gov/REST/rxclass/classMembers.json?classId=${atcClass}&relaSource=ATC`,
            headers: { }
        };
          
        let rxcuiList = await axios.request(config);
        let drugMember=rxcuiList.data.drugMemberGroup.drugMember;
        let requiredList= drugMember.filter(x=>drugList.includes(x.minConcept.name));
        let ingredient_output=[]
        for(let drug of requiredList)
        {
            let obj={
                atc_class:atcClass,
                atc_code: drug.nodeAttr.find(x=>x.attrName=="SourceId").attrValue,
                drug_name: drug.minConcept.name,
                ingredient_rxcui: drug.minConcept.rxcui
            }
            ingredient_output.push(obj);
        }
        let output = await getRelatedByType(ingredient_output);
        return output;

    }
    catch(error)
    {
        console.log(error.message)
    }
}

const getRelatedByType = async (ingredient_output) => {
    try{
        let outputList=[];
        for(let ingredientRxcui of ingredient_output)
        {
            let config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `https://rxnav.nlm.nih.gov/REST/rxcui/${ingredientRxcui.ingredient_rxcui}/related.json?tty=SBD+SCD+BPCK+GPCK+SBDF+SCDF+SBDG+SCDG+SBDC+BN+MIN+SCDC+PIN+IN`,
                headers: { }
            };

            let rxcuiList = await axios.request(config);
            for(let conceptGroup of rxcuiList.data.relatedGroup.conceptGroup)
            {
                if(conceptGroup.conceptProperties)
                {
                    for(let conceptProperty of conceptGroup.conceptProperties)
                    {
                        let data=await isHumanDrugAndStrength(conceptProperty.rxcui);
                        let obj={
                            atc_class:ingredientRxcui.atc_class,
                            atc_code: ingredientRxcui.atc_code,
                            drug_name: ingredientRxcui.drug_name,
                            ingredient_rxcui: ingredientRxcui.ingredient_rxcui,
                            tty:conceptProperty.tty,
                            rxcui:conceptProperty.rxcui,
                            name:conceptProperty.name,
                            df: await getDosageForm(conceptProperty.rxcui),
                            strength:data.strength,
                            human_drug: data.humanDrug,
                            strength_num:data.strength?.split(' ')[0],
                            UOM:data.strength?.split(' ')[1]
                        } 
                        let list=await getHistoricalNDCs(obj);
                        outputList=outputList.concat(list);
                    }
                    
                }
            }
        }
        return outputList;
    }
    catch(error)
    {
        console.log(error.message)
    }
}

const getDosageForm= async (rxcui) => {
    try{
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/related.json?tty=DF`,
            headers: { }
        };
          
        let data = await axios.request(config);
        if(data.data.relatedGroup.conceptGroup && data.data.relatedGroup.conceptGroup[0].conceptProperties)
        {
            return data.data.relatedGroup.conceptGroup[0].conceptProperties[0].name;
        }
        else
        {
            return null;
        }

    }
    catch(error)
    {
        console.log(error.message);
    }
}

const isHumanDrugAndStrength= async (rxcui) => {
    try{
        let hd=0;
        let strength=null;
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/allProperties.json?prop=ATTRIBUTES`,
            headers: { }
        };
          
        let data = await axios.request(config);
        let humanDrug= data.data.propConceptGroup.propConcept.find(x=>x.propName=='HUMAN_DRUG');
        if(humanDrug)
        {
            hd = 1;
        }
        let str = data.data.propConceptGroup.propConcept.find(x=>x.propName=='AVAILABLE_STRENGTH')
        if(str)
        {
            strength = str.propValue;
        }
        let obj={
            humanDrug:hd,
            strength:strength
        }
        return obj;

    }
    catch(error)
    {
        console.log(error);
    }
}

const getHistoricalNDCs= async (obj) => {
    try{
        let list=[];
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://rxnav.nlm.nih.gov/REST/rxcui/${obj.rxcui}/allhistoricalndcs.json?history=1`,
            headers: { }
        };
          
        let data = await axios.request(config);
        if( Object.keys(data.data).length != 0 && data.data.historicalNdcConcept.historicalNdcTime)
        {
            for(let ndc of data.data.historicalNdcConcept.historicalNdcTime[0].ndcTime) 
            {
                obj.ndc= ndc.ndc[0];
                obj.startDate= ndc.startDate;
                obj.endDate= ndc.endDate;
                list.push(obj);
            }
        }
        else
        {
            obj.ndc= null;
            obj.startDate= null;
            obj.endDate= null;
            list.push(obj);
        }
        
        return list;

    }
    catch(error)
    {
        console.log(error.message);
    }
}

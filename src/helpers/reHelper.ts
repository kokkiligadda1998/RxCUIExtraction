const axios = require('axios');
import * as XLSX from 'xlsx';
import parseHrtimeToSeconds from "../utils/parseHrtimeToSeconds";
import { HttpError } from '../utils/HttpError';


export const extractRXCUI = async (data,file) => {

  let startTime = process.hrtime();
  try {
    const drug_name='DRUG_NAME';
    const atc_class='ATC_CLASS';
    let drugList=[];
    let atcClass,workbook,listFromATC,listFromDrugNames,finalList;
    
    const resultAnalysis: ResultAnalysis[] = [];

    if(file == null)
    {
        if(data.atcClass == null)
        {
            throw Error("Please provide atc class list to continue the process");
        }
        if(data.drugList == null)
        {
            throw Error("Please provide drug list to continue the process");
        }
        atcClass= data.atcClass.split(",");
        drugList= data.drugList.split(",");
    }
    else
    {
        workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if(sheetName.toLowerCase()!='input')
        {
            throw Error();
        }
        const sheet = workbook.Sheets[sheetName.toString()];
        let sheetdata = XLSX.utils.sheet_to_json(sheet);
        drugList=sheetdata.map(x=>x[drug_name]);
        atcClass=sheetdata.map(x=>x[atc_class]).filter(x=>x);
    }
    
    if(atcClass && drugList)
    {
       listFromATC= await extractRxCUIFromATC(atcClass,drugList);
       resultAnalysis.push(...listFromATC.resultAnalysis);

       listFromDrugNames= await extractRxCUIFromDrugNames(drugList,listFromATC.outputSheet);
       resultAnalysis.push(...listFromDrugNames.resultAnalysis);

       finalList= listFromATC.outputSheet.concat(listFromDrugNames.outputStringSheet);
    }

    return {
        isSuccess: true,
        data:finalList,
        resultAnalysis: [
          ...resultAnalysis,
          {
            from: `reHelper.${extractRXCUI.name}`,
            timeInMilliSec: parseHrtimeToSeconds(process.hrtime(startTime)),
            isSuccess: true,
          },
        ],
    };
    
      
  } catch (error) {
    
    const e = HttpError.convertErrorToHttpError(error as Error);

    e.resultAnalysis.push({
      isSuccess: false,
      from: `reHelper.${extractRXCUI.name}`,
      errorMessage: e.message,
      timeInMilliSec: parseHrtimeToSeconds(process.hrtime(startTime))
    });
    throw e;
  }
};

const extractRxCUIFromATC = async (atcClassList,drugList) => {
    let startTime = process.hrtime();

    try{
        let ingredient_output=[];
        let output;
        const resultAnalysis: ResultAnalysis[] = [];
        for(let atcClass of atcClassList)
        {
            let config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `https://rxnav.nlm.nih.gov/REST/rxclass/classMembers.json?classId=${atcClass}&relaSource=ATC`,
                headers: { }
            };
              
            let rxcuiList = await axios.request(config);
            let drugMember=rxcuiList.data.drugMemberGroup.drugMember;
            let requiredList= drugMember.filter(x=>drugList.includes(x.minConcept.name));
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
        }
        output = await getRelatedByType(ingredient_output,null);
        resultAnalysis.push(...output.resultAnalysis);

        return {
            isSuccess: true,
            outputSheet:output.output,
            resultAnalysis: [
              ...resultAnalysis,
              {
                from: `reHelper.${extractRxCUIFromATC.name}`,
                timeInMilliSec: parseHrtimeToSeconds(process.hrtime(startTime)),
                isSuccess: true,
              },
            ],
        };
    }
    catch(error)
    {
        const e = HttpError.convertErrorToHttpError(error as Error);

        e.resultAnalysis.push({
        isSuccess: false,
        from: `reHelper.${extractRxCUIFromATC.name}`,
        errorMessage: e.message,
        timeInMilliSec: parseHrtimeToSeconds(process.hrtime(startTime))
        });
        throw e;
    }
}

const extractRxCUIFromDrugNames = async (drugList,list) => {
    let startTime = process.hrtime();
    try
    {
        let output;
        let ingredient_output=[];
        const resultAnalysis: ResultAnalysis[] = [];
        for(let drug of drugList)
        {
            let config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${drug}&allsrc=0&search=2`,
                headers: { }
            };
            let ingredient_rxcui = await axios.request(config);
            let obj={
                atc_class:null,
                atc_code: null,
                drug_name: drug,
                ingredient_rxcui: ingredient_rxcui.data.idGroup.rxnormId[0]
            }
            ingredient_output.push(obj);
        }
        output = await getRelatedByType(ingredient_output,list);
        resultAnalysis.push(...output.resultAnalysis);

        output.output.map(x=>x.atc_code="Z99");

        return {
            isSuccess: true,
            outputStringSheet:output.output,
            resultAnalysis: [
              ...resultAnalysis,
              {
                from: `reHelper.${extractRxCUIFromDrugNames.name}`,
                timeInMilliSec: parseHrtimeToSeconds(process.hrtime(startTime)),
                isSuccess: true,
              },
            ],
        };
    }
    catch(error)
    {
        const e = HttpError.convertErrorToHttpError(error as Error);

        e.resultAnalysis.push({
        isSuccess: false,
        from: `reHelper.${extractRxCUIFromDrugNames.name}`,
        errorMessage: e.message,
        timeInMilliSec: parseHrtimeToSeconds(process.hrtime(startTime))
        });
        throw e;
    }
}

const getRelatedByType = async (ingredient_output,listfromDrugs) => {
    let startTime = process.hrtime();
    try{
        let outputList=[];
        const resultAnalysis: ResultAnalysis[] = [];
        for(let ingredientRxcui of ingredient_output)
        {
            let config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `https://rxnav.nlm.nih.gov/REST/rxcui/${ingredientRxcui.ingredient_rxcui}/related.json?tty=SBD+SCD+BPCK+GPCK+SBDF+SCDF+SBDG+SCDG+SBDC+BN+MIN+SCDC+PIN+IN`,
                headers: { }
            };

            let rxcuiList = await axios.request(config);
            let templist;
            if(listfromDrugs!=null)
            {
                templist=listfromDrugs.map(x => Object.assign({}, x, { atc_class:null, atc_code: null }))
                templist=templist.map(x=>JSON.stringify(x));
            }
            for(let conceptGroup of rxcuiList.data.relatedGroup.conceptGroup)
            {
                if(conceptGroup.conceptProperties)
                {
                    for(let conceptProperty of conceptGroup.conceptProperties)
                    {
                        let data=await isHumanDrugAndStrength(conceptProperty.rxcui);
                        if(data.humanDrug==1)
                        {
                            let obj={
                                atc_code: ingredientRxcui.atc_code,
                                tty:conceptProperty.tty,
                                strength:data.strength,
                                UOM:data.strength?.split(' ')[1],
                                DRUG: ingredientRxcui.drug_name,
                                RXCUI:conceptProperty.rxcui,
                                GENNME:conceptProperty.name,
                                STRENGTH_PER_UNIT:data.strength?.split(' ')[0],
                                MASTER_FORM: await getDosageForm(conceptProperty.rxcui), 
                            } 
                            if(listfromDrugs==null)
                            {
                                let list=await getHistoricalNDCs(obj);
                                outputList=outputList.concat(list);
                            }
                            else
                            {
                                let list=await getHistoricalNDCs(obj);
                                list=list.map(x=>JSON.stringify(x));
                                list=list.filter(x=>templist.indexOf(x)==-1)
                                list=list.map(x=>JSON.parse(x));
                                outputList=outputList.concat(list);
                            }
                        }
                    }
                    
                }
            }
        }

        return {
            isSuccess: true,
            output:outputList,
            resultAnalysis: [
              {
                from: `reHelper.${getRelatedByType.name}`,
                timeInMilliSec: parseHrtimeToSeconds(process.hrtime(startTime)),
                isSuccess: true,
              },
            ],
        };
    }
    catch(error)
    {
        const e = HttpError.convertErrorToHttpError(error as Error);

        e.resultAnalysis.push({
        isSuccess: false,
        from: `reHelper.${getRelatedByType.name}`,
        errorMessage: e.message,
        timeInMilliSec: parseHrtimeToSeconds(process.hrtime(startTime))
        });
        throw e;
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
        if(data.data.relatedGroup.conceptGroup && data.data.relatedGroup.conceptGroup[0].conceptProperties && data.data.relatedGroup.conceptGroup[0].tty!="IN")
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
        throw error;
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
        throw error;
    }
}

const getHistoricalNDCs= async (obj) => {
    try{
        let list=[];
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://rxnav.nlm.nih.gov/REST/rxcui/${obj.RXCUI}/allhistoricalndcs.json?history=1`,
            headers: { }
        };
          
        let data = await axios.request(config);
        if( Object.keys(data.data).length != 0 && data.data.historicalNdcConcept.historicalNdcTime)
        {
            for(let ndc of data.data.historicalNdcConcept.historicalNdcTime[0].ndcTime) 
            {
                obj.NDC= ndc.ndc[0];
                obj.start_date= ndc.startDate.substring(4,6) + "/1/"+ndc.startDate.substring(0,4);
                obj.end_date= ndc.endDate.substring(4,6)+"/"+ new Date(ndc.endDate.substring(0,4), parseInt(ndc.endDate.substring(4,6))+1, 0).getDate() + "/"+ndc.endDate.substring(0,4);
                list.push(obj);
            }
        }
        else
        {
            obj.NDC= null;
            obj.start_date= null;
            obj.end_date= null;
            list.push(obj);
        }
        
        return list;

    }
    catch(error)
    {
        throw error;
    }
}

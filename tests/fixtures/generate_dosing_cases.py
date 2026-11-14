# Independent expected values. This script imports no application code.
import json
from fractions import Fraction as F
from pathlib import Path
cases=[]
def add(id,description,dose,unit,conc,cunit,syringe='Insulin',total=None,solution=None):
    d=F(str(dose)); c=F(str(conc)) if conc is not None else F(str(total))/F(str(solution))
    converted=d/1000 if unit=='mcg' and cunit=='mg/ml' else d*1000 if unit=='mg' and cunit=='mcg/ml' else d
    volume=d if unit=='mL' else converted/c
    marking=volume*100 if syringe=='Insulin' else volume
    # All selected rational values have finite decimal expansions.
    def decimal(v):
        from decimal import Decimal
        return format(Decimal(v.numerator)/Decimal(v.denominator),'f').rstrip('0').rstrip('.') if v.denominator!=1 else str(v.numerator)
    inputs=dict(doseValue=dose,unit=unit,concentration=conc,concentrationUnit=cunit,manualSyringe=dict(type=syringe,volume='1 ml' if syringe=='Insulin' else '3 ml'))
    if total is not None: inputs.update(totalAmount=total,totalAmountUnit=cunit.split('/')[0])
    if solution is not None: inputs['solutionVolume']=str(solution)
    cases.append(dict(id=id,description=description,inputs=inputs,expected=dict(volume_mL=float(volume),marking=decimal(marking)),computed_by='independent hand calculation',verified_by='pending-rodney'))
for i,d in enumerate([100,125,250,375,500,625,750,1000,1250,1500,1750,2000],1):
    add(f'peptide-{i:02}',f'{d} mcg from 5 mg vial plus 2 mL BAC',d,'mcg',None,'mg/ml',total=5,solution=2)
for i,d in enumerate([50,75,100,125,150,175,200,225,250],1):
    add(f'trt-{i:02}',f'{d} mg testosterone cypionate at 200 mg/mL',d,'mg',200,'mg/ml','Standard')
for i,d in enumerate([0.25,0.5,0.75,1,1.25,1.5,2,2.5],1):
    add(f'semaglutide-{i:02}',f'{d} mg dose at 2.5 mg/mL (semaglutide-style arithmetic)',d,'mg',2.5,'mg/ml')
for i,d in enumerate([2.5,5,7.5,10,12.5,15],1):
    add(f'tirzepatide-{i:02}',f'{d} mg dose at 20 mg/mL (tirzepatide-style arithmetic)',d,'mg',20,'mg/ml')
for i,d in enumerate([5,10,15,20,25,29,30,40,50],1):
    add(f'insulin-{i:02}',f'{d} units at 100 units/mL on U-100 syringe',d,'units',100,'units/ml')
for i,d in enumerate([25,50,100,125,250,500],1):
    add(f'mcg-{i:02}',f'{d} mcg at 500 mcg/mL',d,'mcg',500,'mcg/ml')
for i,d in enumerate([0.05,0.1,0.25,0.5,1,1.5,2],1):
    add(f'direct-{i:02}',f'{d} mL direct volume with concentration populated',d,'mL',1,'mg/ml','Standard')
for i,d in enumerate([0.1,0.25,0.5,1],1):
    add(f'mg-to-mcg-{i:02}',f'{d} mg at 1000 mcg/mL',d,'mg',1000,'mcg/ml')
add('direct-no-concentration','0.5 mL direct volume without concentration',0.5,'mL',1,'mg/ml','Standard')
cases[-1]['inputs']['concentration']=None


add('saf101-01','250 mcg from scanned 5000 mcg vial in 2 mL',250,'mcg',None,'mcg/ml',total=5000,solution=2)
cases[-1]['inputs']['concentrationUnit']='mg/ml'
add('saf101-02','Planner prefill 5000 mcg vial in 2 mL, 250 mcg dose',250,'mcg',None,'mcg/ml',total=5000,solution=2)
add('saf101-03','Planner scanned 1,000 mcg vial, 100 mcg in 0.1 mL',100,'mcg',None,'mcg/ml',total=1000,solution=1)
add('saf101-04','10 mg vial, 300 mcg target in 0.1 mL: exact concentration 3 mg/mL',300,'mcg',3,'mg/ml',total=10)
cases[-1]['inputs'].update(solutionVolume=str(F(10,3)),concentrationExact='3')
add('saf101-05','0.29 mg at 1 mg/mL gives marking 29',0.29,'mg',1,'mg/ml')
Path(__file__).with_name('dosing-cases.json').write_text(json.dumps(cases,indent=2)+'\n')
print(len(cases),'independently computed fixtures')

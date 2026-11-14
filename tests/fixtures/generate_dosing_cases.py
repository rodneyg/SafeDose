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
add('saf101-06','5 mg / mL normalized before 0.5 mg dose calculation',0.5,'mg',5,'mg/ml')
add('saf101-07','Confirmed Standard 3 mL syringe after unreadable scan',0.5,'mL',1,'mg/ml','Standard')
add('saf101-08','250 mcg from 5000 mcg in 2 mL on U-40: 4 scale units',250,'mcg',None,'mcg/ml',total=5000,solution=2)
cases[-1]['inputs']['manualSyringe']['insulinScale']='U-40'
cases[-1]['expected']['marking']='4' # 0.1 mL * 40 units/mL
add('saf101-09','2.5 mL on 5 mL syringe is blocked by unchanged 2 mL policy',2.5,'mL',1,'mg/ml','Standard')
cases[-1]['inputs']['manualSyringe']['volume']='5 ml'
cases[-1]['expected'].update(marking=None,error_contains='2 mL per-injection safety limit')
add('saf101-10','0.25 mg at 1 mg/mL with Standard 1 mL: advice is guidance',0.25,'mg',1,'mg/ml','Standard')
cases[-1]['inputs']['manualSyringe']['volume']='1 ml'
cases[-1]['expected'].update(error=None,guidance='Draw to 0.25 ml, which is between the 0.2 ml and 0.3 ml marks.')
# Label-contract oracles, authored independently of the application parsers.
def label_case(id, description, operation, inputs, expected):
    cases.append(dict(id=id,description=description,operation=operation,inputs=inputs,expected=expected,
                      computed_by='independent label contract',verified_by='pending-rodney'))
label_case('saf101-03-concentration','Planner concentration must not become vial amount','plannerScan',{'concentration':'5 mg/mL'},{'ok':False})
label_case('saf101-03-thousands','Planner thousands and explicit mcg unit','plannerScan',{'totalAmount':'1,000 mcg'},{'ok':True,'value':{'amount':1000,'unit':'mcg'}})
label_case('saf101-06-unknown','Unknown IU/mL concentration blocks','concentrationScan',{'text':'5 IU/mL'},{'ok':False})
label_case('saf101-06-spacing','Harmless concentration whitespace normalizes','concentrationScan',{'text':'5 mg / mL'},{'ok':True,'value':{'amount':5,'unit':'mg/ml'}})
label_case('saf101-07-volume','Unreadable syringe volume blocks','syringeScan',{'type':'Insulin','volume':'unreadable','scale':'U-100'},{'ok':False})
label_case('saf101-07-type','Unknown syringe type blocks','syringeScan',{'type':'unknown','volume':'3 ml'},{'ok':False})

# SAF-103 property counterexamples. Error results must not expose numeric outputs.
# Values and rejection reasons are independent policy/arithmetic oracles.
def rejected_case(id, description, inputs, error):
    cases.append(dict(id=id, description=description, inputs=inputs,
                      expected=dict(volume_mL=None, marking=None, calculatedConcentration=None, error_contains=error),
                      computed_by='independent safety contract', verified_by='pending-rodney'))
standard = dict(type='Standard', volume='3 ml')
base = dict(doseValue=1, unit='mg', concentration=10, concentrationUnit='mg/ml', manualSyringe=standard)
rejected_case('saf103-below-minimum', 'Shrunk direct-volume counterexample: 0.001 mL returns no numeric result',
              dict(base, doseValue=0.001, unit='mL', concentration=None,
                   manualSyringe=dict(type='Insulin', volume='0.3 ml', insulinScale='U-100')),
              'VOLUME_THRESHOLD_ERROR:')
rejected_case('saf103-extreme-dose', 'Shrunk extreme-dose counterexample: 1e308 / 10 must return no numeric result',
              dict(base, doseValue=1e308), '2 mL per-injection safety limit')
rejected_case('saf103-overflow', 'Finite operands whose quotient overflows must return no numeric result',
              dict(base, doseValue=1e308, concentration=1e-308), '2 mL per-injection safety limit')
rejected_case('saf103-capacity', '0.4 mL on a 0.3 mL syringe returns no numeric result',
              dict(base, doseValue=1, concentration=2.5,
                   manualSyringe=dict(type='Insulin', volume='0.3 ml', insulinScale='U-100')),
              'exceeds syringe capacity')
rejected_case('saf103-availability', '0.001 mg requested from 0.0005 mg available returns no numeric result',
              dict(base, doseValue=0.001, concentration=0.002, totalAmount=0.0005, totalAmountUnit='mg'),
              'exceeds total amount available')
rejected_case('saf103-low-concentration', 'Rejected derived concentration must not remain a numeric output',
              dict(base, concentration=None, totalAmount=0.001, totalAmountUnit='mg', solutionVolume='1'),
              'extremely low')
Path(__file__).with_name('dosing-cases.json').write_text(json.dumps(cases,indent=2)+'\n')
print(len(cases),'independently computed fixtures')

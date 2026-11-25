import Head from 'expo-router/head';
import { Link } from 'expo-router';
import { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const educationNote = 'This page is general education, not medical advice. Always check against your prescription label and talk with your clinician or pharmacist about your dose.';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}><Text accessibilityRole="header" style={styles.heading}>{title}</Text>{children}</View>;
}

function Bullet({ children }: { children: ReactNode }) {
  return <Text style={styles.body}>{'\u2022'} {children}</Text>;
}

function Step({ number, children }: { number: number; children: ReactNode }) {
  return <Text style={styles.body}>{number}. {children}</Text>;
}

function Note() {
  return <View style={styles.note}><Text style={styles.noteText}>{educationNote}</Text></View>;
}

export default function DosingProblemPage() {
  return (
    <SafeAreaView style={styles.screen}>
      {Platform.OS === 'ios' && (
        <Head>
          <title>The dosing problem | SafeDose</title>
          <meta name="description" content="Why units, mL and mg get mixed up, how syringe sizes differ, and one worked reconstitution example. Education only, not medical advice." />
        </Head>
      )}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Link href="/" style={styles.link}>SafeDose</Link>
          <Text accessibilityRole="header" style={styles.title}>The dosing problem</Text>
          <Text style={styles.intro}>Most dosing mistakes aren't about the medicine. They're about the math and the markings. We read public posts from more than 170 people measuring doses at home: GLP-1 shots, testosterone, peptides and insulin. The same few mix-ups came up again and again. Here they are in plain language.</Text>
          <Note />

          <Section title="Units, mL and mg are three different things">
            <Bullet>mg (or mcg) is how much medicine. That's the number your prescription cares about.</Bullet>
            <Bullet>mL is how much liquid.</Bullet>
            <Bullet>&quot;Units&quot; on an insulin syringe are tick marks for liquid. On a U-100 syringe, 100 units is 1 mL, so 1 unit is 0.01 mL.</Bullet>
            <Bullet>How much medicine is in each unit depends on your vial's strength (mg per mL). The same number of units from two different vials can be two very different doses.</Bullet>
            <Bullet>One exception: with U-100 insulin, syringe units match units of insulin. For everything else, units are only a measure of liquid.</Bullet>
          </Section>

          <Section title="Syringe sizes look alike but read differently">
            <Bullet>Common U-100 sizes are 1 mL (100 units), 0.5 mL (50 units) and 0.3 mL (30 units). 10 units is the same amount of liquid on all three.</Bullet>
            <Bullet>The lines are spaced differently. Many 1 mL syringes mark every 2 units. Smaller ones often mark every unit, and some 0.3 mL syringes mark half units. Count the lines on yours before you draw.</Bullet>
            <Bullet>Many syringes print a units scale and an mL scale side by side. 0.1 mL and 10 units are the same line. Reading the wrong scale is how a dose ends up 10 times too big.</Bullet>
            <Bullet>U-40 syringes exist too, mostly for some pet insulins. They are not interchangeable with U-100.</Bullet>
            <Bullet>Pens: counting clicks is not a dosing method most pen makers approve. Ask your prescriber before you try it.</Bullet>
          </Section>

          <Section title="Reconstitution math, one example">
            <Text style={styles.label}>Three steps:</Text>
            <Step number={1}>Strength = mg in the vial / mL of water you added.</Step>
            <Step number={2}>Volume to inject = your dose in mg / strength.</Step>
            <Step number={3}>Units on a U-100 syringe = volume in mL x 100.</Step>
            <View style={styles.example}><Text style={styles.exampleText}>Example: a 10 mg vial plus 2 mL of bacteriostatic water is 5 mg per mL. A 0.5 mg dose is 0.5 / 5 = 0.1 mL. On a U-100 syringe, 0.1 mL is 10 units.</Text></View>
            <Text style={styles.body}>Change the water, change the units. The same 10 mg vial mixed with 1 mL is 10 mg per mL, so 0.5 mg is 5 units. Write the strength on the vial so future you doesn't have to guess.</Text>
          </Section>

          <Section title="Mistakes we kept seeing">
            <Bullet>Reading 8 as 80. The syringe was marked in steps of 10, so a prescribed 8 units became 80. That's 10 times the dose.</Bullet>
            <Bullet>Treating mL and mg as the same thing. The prescription said 0.25 mg and the person drew 0.25 mL, which on their vial was 2.5 times the dose.</Bullet>
            <Bullet>New vial, old habit. The pharmacy switched to a stronger vial and the person drew the same number of units as before.</Bullet>
            <Bullet>The wrong vial size in the math. Someone followed mixing steps for a 5 mg vial while holding a 10 mg vial, and took double for days.</Bullet>
            <Bullet>New syringe, same line. People switched from a 1 mL to a 0.3 or 0.5 mL syringe and assumed the lines meant the same thing.</Bullet>
            <Bullet>Instructions that didn't add up. Labels listed mL in one place and units in another. The FDA has reported cases where a provider meant 5 units and wrote 25.</Bullet>
            <Bullet>Two pens, one sleepy morning. People grabbed the wrong insulin pen.</Bullet>
            <Bullet>Testosterone written only in mL. 0.25 mL of 200 mg/mL is 50 mg. 0.25 mL of 100 mg/mL is 25 mg. Always say the mg.</Bullet>
          </Section>

          <Section title="Why it matters">
            <Text style={styles.body}>The FDA warned in July 2024 that people using compounded semaglutide had taken 5 to 10 times their intended dose, some ending up in the hospital, often from mixing up mL, mg and units. The Washington Poison Center's GLP-1 calls doubled from 211 in 2024 to 421 in 2025.</Text>
            <Link href="https://www.fda.gov/drugs/human-drug-compounding/fda-alerts-health-care-providers-compounders-and-patients-dosing-errors-associated-compounded" style={styles.link}>Read the FDA alert</Link>
            <Link href="https://www.king5.com/article/news/investigations/investigators/washington-poison-center-calls-glp1-diet-drugs-double-since-2024/281-2710a947-171b-404b-adb9-10fe8da5656a" style={styles.link}>Read the Washington Poison Center report</Link>
          </Section>

          <Section title="A quick check before every shot">
            <Step number={1}>Read your label for the strength (mg per mL).</Step>
            <Step number={2}>Write your dose in mg. Convert to mL, then to units.</Step>
            <Step number={3}>Look at your syringe: its size, which scale you're reading, and how far apart the lines are.</Step>
            <Step number={4}>If anything changed (new vial, new syringe, new pharmacy), redo the math and confirm it with your pharmacist.</Step>
            <Step number={5}>Not sure? Don't inject yet. Call your pharmacist or prescriber. In the US, Poison Control is 1-800-222-1222.</Step>
          </Section>

          <Section title="Where SafeDose fits">
            <Text style={styles.body}>SafeDose is a measurement aid. Use it to double-check your math, then check the result against your prescription label, your pharmacist and your clinician. It doesn't replace any of them. If you use the scanner, always confirm the line on your own syringe yourself.</Text>
            <Link href="/" style={styles.button}>Open SafeDose</Link>
          </Section>
          <Note />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAF8' },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 48 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  link: { color: '#166654', fontSize: 16, marginBottom: 12, textDecorationLine: 'underline', alignSelf: 'flex-start' },
  title: { color: '#172C27', fontSize: 40, fontWeight: '700', marginTop: 20, marginBottom: 16 },
  intro: { color: '#354A43', fontSize: 18, lineHeight: 29, marginBottom: 24 },
  note: { backgroundColor: '#E8F3EF', borderLeftColor: '#166654', borderLeftWidth: 4, padding: 18, marginVertical: 16 },
  noteText: { color: '#173D34', fontSize: 16, fontWeight: '600', lineHeight: 25 },
  section: { borderTopColor: '#D9E1DC', borderTopWidth: 1, paddingTop: 32, marginTop: 24, gap: 10 },
  heading: { color: '#172C27', fontSize: 26, lineHeight: 34, fontWeight: '700', marginBottom: 6 },
  body: { color: '#354A43', fontSize: 16, lineHeight: 26 },
  label: { color: '#172C27', fontSize: 16, lineHeight: 26, fontWeight: '700' },
  example: { backgroundColor: '#F0F4F2', borderRadius: 8, padding: 18, marginVertical: 8 },
  exampleText: { color: '#172C27', fontSize: 16, fontWeight: '600', lineHeight: 26 },
  button: { backgroundColor: '#166654', color: '#FFFFFF', fontSize: 16, fontWeight: '700', paddingHorizontal: 20, paddingVertical: 13, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8, overflow: 'hidden' },
});

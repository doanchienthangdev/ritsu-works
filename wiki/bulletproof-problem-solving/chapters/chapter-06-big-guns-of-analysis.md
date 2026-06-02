---
type: book
slug: bulletproof-problem-solving__chapter-06-big-guns-of-analysis
title: Chapter 6 — Big Guns of Analysis
parent_book: bulletproof-problem-solving
chapter_index: 6
pdf_pages: [165, 208]
source_kind: book
source_ref: raw/mckinsey/bulletproof-problem-solving.pdf#chapter-06
source_hash: null
content_hash: a922d1ce69a6a5b846bf42b9a898150d4cf6abd6b8d69df5b4d0486c6c4d61a5
license_status: copyrighted_internal_only
rights_notice: Copyright © 2018 Charles Conn and Robert McLean / John Wiley & Sons. All rights reserved. INTERNAL USE ONLY — attribution-watcher fires Tier B when ≥3 observations from this source contribute to an external content draft.
authors:
  - Charles Conn
  - Robert McLean
publisher: John Wiley & Sons, Inc.
year: 2018
ingestion_job_id: 54d785b4-3c7a-4420-8149-ba8eef691b5b
parent_ingestion_job_id: c39fbd1e-95c0-493a-aa1a-f9be10848b82
extracted_from_source_id: null
ingested_at: 2026-06-02
generated_by: wiki-sync v4.0 (Claude-walked, distill mode, autonomous batch 2026-06-02) chapter-splitter
---

<!-- generated-by: wiki-sync v4.0 (Claude-walked, distill mode, autonomous batch 2026-06-02) chapter-splitter -->

# Chapter 6 — Big Guns of Analysis

> Verbatim chapter projection, PDF pp. 165–208. Copyright © 2018 Charles Conn and Robert McLean / John Wiley & Sons. All rights reserved. INTERNAL USE ONLY

Chapter Six
135
In Chapter  5 we introduced a set of first-cut heuristics and root 
cause thinking to make the initial analysis phase of problem solv-
ing simpler and faster. We showed that you can often get good-
enough analytic results quickly for many types of problems with 
little mathematics or model building. But what should you do when 
Big Guns of Analysis
136	
Big Guns of Analysis
faced with a complex problem that really does require a robustly 
quantified solution? When is it time to call in the big guns—Bayes-
ian statistics, regression analysis, Monte Carlo simulation, rand-
omized controlled experiments, machine learning, game theory, 
or ­crowd-sourced solutions? This is certainly an arsenal of analytic 
weaponry that many of us would find daunting to consider employ-
ing. Even though your team may not have the expertise to use 
these more complex ­problem solving tools, it is important for the 
workforce of today to have an understanding of how they can be 
applied to challenging problems. In some cases you may need to 
draw on outside experts, in other instances you can learn to master 
these techniques yourself.
The critical first step is to ask this question: Have you adequately 
framed the problem you face, and the hypothesis you want to test, 
so that it’s clear you do need more firepower? If you decide your 
problem does fall into the genuinely complex range, you then need 
to consider other questions. Is there data available to support using 
an advanced analytic tool? Which tool is the right one for your prob-
lem? Is there user-friendly software available to help your team use 
some of these tools? Can you outsource this aspect of the problem 
solving work?
Firepower Availability
It used to be that larger problems involved specialist-managed, 
time-intensive, and costly analytic processes. With the rapid rise in 
available computing power and the decline in data storage costs, 
more of these tools are now accessible. Software packages that 
allow you to run sophisticated analyses with only a few command 
lines are becoming more common, and have become substantially 
more straightforward for the everyday user. For example, regres-
sion analysis is available in Excel by loading the Analysis ToolPak, 
and Monte Carlo simulation and other tools are available from the 
R-Project, a free analytic software resource.
Given greater accessibility, we are seeing increased use of sophis-
ticated modeling tools, such as machine learning, earlier in the 
	
Sequence Your Thinking	
137
problem solving process in businesses, consulting firms, and gov-
ernment institutions. Sometimes this is warranted, but often the 
use of high-powered tools seems to be premature or misplaced. 
As we saw in Chapter 5, before embarking on complex analyses, we 
believe you are better off refining your thinking about the problem 
structure and the hypotheses you’re testing by doing some ­initial 
order-of-magnitude analysis. Why? First-cut data analysis often 
points to direction of causality and size of impact, which are critical 
to evaluating the results of complex models later. Showing model 
correlations in the absence of clear explanation doesn’t prove any-
thing. And knowing that one configuration or algorithm explains 
slightly more variance in a multivariable model often brings you 
no closer to understanding root causes. Data-fishing expeditions 
or unfocused analysis that “boil the ocean” are likely to result in 
­inefficient problem solving.
Professor Stephen Roberts, a machine-learning expert at Oxford, 
emphasizes the need to rigorously frame a question or hypothesis 
before embarking on complex analysis. He advises students not to 
commence machine-learning analysis until such time as they have 
developed a clear idea of the structure of the model and testable 
hypotheses, the essence of the scientific method.1
In this chapter, we explain where and how to apply advanced ana-
lytical approaches, as well as some of their limitations. Even if you 
don’t personally employ the analytic big guns, you are likely to be 
presented with analysis that comes from these approaches.
Sequence Your Thinking
The process we recommend for deciding when to use the big 
guns is a sequential one. Our preferred sequence, not surpris-
ingly, is to start with clearly defining the problem and forming initial 
­hypotheses. Then get to know your data by looking at the mean, 
median, and mode, as well as other summary statistics. Plotting the 
distributions of key variables will point to the skew (difference from 
1Personal communication with Professor Stephen Roberts, Oxford University.
138	
Big Guns of Analysis
a normal distribution), if any, in the data. Experiment with visu-
alizing the data and correlations with scatter plots or hot-spot 
diagrams (Exhibit 6.2, which shows the air quality and asthma in 
London, is a good example of this). Of course this assumes you 
have data—we’ll show some approaches to dealing with limited 
data ­environments below.
Which Big Gun to Choose?
We worked with Oxford academics and our research team with 
experience in data analytics to design a decision tree that can 
help guide you to using the right analysis tool. The most important 
defining question at the outset is to understand the nature of your 
problem: Are you primarily trying to understand the drivers of cau-
sation of your problem (how much each element contributes and 
in what direction), or are you primarily trying to predict a state of 
the world in order to make a decision? The first question leads you 
mostly down the left-hand branch into various statistical analyses, 
including creating or discovering experiments. The second ques-
tion leads you mostly down the right-hand side of the tree into 
­forecasting models, the family of machine or deep learning algo-
rithms, and game theory. Some problems have elements of both 
sides, and require combining tools from both branches of the deci-
sion tree. And simulations and forecasting models can be found on 
both sides of the tree (see Exhibit 6.1).
When you are focused on understanding the complex causes of 
your problem, so that you can develop strategies for intervention, 
you are usually in the world of statistics. Here the quality and extent 
of your data is critical to knowing which tool you can use. If you have 
good data, you can use correlation and regression tools, many of 
which are available in quite easy-to-use software packages. There 
are more and more externally available data sets, many of which 
are low cost or free. Sometimes external data doesn’t exist for your 
problem, but you can design an experiment to develop your own 
data. Experiments have long been so important in safety-critical 
fields like medicine, for instance, where robustly inferring whether 
	
Which Big Gun to Choose?	
139
EXHIBIT 6.1 
140	
Big Guns of Analysis
drugs cause intended effects and side effects is essential. Experi-
ments have become ubiquitous in business and economics as meth-
odologies improve and costs to run experiments have declined, 
particularly in online settings. In lots of cases, however, there are 
costs, complexity, and ethical hurdles to experimentation (which 
involve treating two similar groups differently). If you are clever (and 
lucky) you may be able to find a natural experiment where the struc-
ture of some real-world situation provides its own control group. 
You may also find yourself in a situation where you have only partial 
data and no potential for experiment. Here ­Bayesian (conditional) 
statistics can be helpful.
When you are mainly focused on predicting outcomes or poten-
tial states of the world to plan decisions, you first have to deter-
mine if it is important to anticipate and model the reaction of other 
players or competitors. If you do, you will probably be employing 
game theory, perhaps enhanced with statistical knowledge. If you 
are not focused on competitor strategies, you are probably opti-
mizing some kind of system or forecasting uncertain outcomes. If 
the first of these, you may be learning how to employ tools from 
machine learning (where understanding is less important that accu-
rate prediction). Particular problems around image recognition and 
language processing may be best suited to the sub-field of neural 
networks. If the second, you will likely be employing forecasting 
models or simulations.
Case Studies for Employing the Big Guns
We know this is a complicated decision tree. To illustrate each of 
these analytic tools in action, we provide case examples of how 
they are used in problem solving. We start with simple data analysis 
and then move on to multiple regression, Bayesian statistics, simu-
lations, constructed experiments, natural experiments, machine 
learning, crowd-sourced problem solving, and finish up with 
another big gun for competitive settings, game theory. Of course 
each of these tools could warrant a textbook on their own, so this 
is necessarily only an introduction to the power and applications of 
each technique.
Case Studies for Employing the Big Guns	
141
Summary of Case Studies
1. Data visualization: London air quality
2. Multivariate regression: Understanding obesity
3. Bayesian statistics: Space Shuttle Challenger disaster
4. Constructed experiments: RCTs and A|B testing
5. Natural experiments: Voter prejudice
6. Simulations: Climate change example
7. Machine learning: Sleep apnea, bus routing, and shark spotting
8. Crowd-sourcing algorithms
9. Game theory: Intellectual property and serving in tennis
It is a reasonable amount of effort to work through these, but bear 
with us—these case studies will give you a solid sense of which 
advanced tool to use in a variety of problem settings.
Data Visualization: Clusters and Hotspots—London 
Air Quality Example
Publicly available data sets are becoming more widely accessible. 
To illustrate the power of relatively simple analysis on public data 
sets, we take the case of air quality in London (Exhibit 6.2). We know 
that one of the major factors affecting air quality is small particu-
late matter, PM 2.5 and PM 10. You don’t want to live in places 
where PM 2.5 levels are frequently high because of respiratory 
and cardiovascular impact. We looked at London using air qual-
ity data and asthma hospital admissions by postcode for the year 
2015. The heat map that results shows the neighborhoods with the 
highest level of risk. As a first cut, it suggests exploring the issue 
further is warranted, even though the correlations aren’t especially 
high between particulate matter and hospital admissions for year-
long data. And as we know, correlations do not prove causation; 
there could be an underlying factor causing both PM 2.5 hotspots 
and asthma hospital admissions. Experiments, more granular data 
­analysis, and large-scale models are the next step for this work.
142	
Big Guns of Analysis
EXHIBIT 6.2 
Source: Q. Di et al., “Air Pollution and Mortality in the Medicare Population,” New England 
Journal of Medicine 376 (June 29, 2017), 2513–2522.
	
Case Studies for Employing the Big Guns	
143
Regression Models to Understand Obesity
Obesity is a genuinely wicked problem to which we will return in 
Chapter 9. There are multiple explanations for its prevalence and 
increase, wide differences between communities, and complex 
behavioral and policy factors at work. Moreover, there are no suc-
cess stories that we are aware of for communities of any scale 
reversing the trend. In this example we want to highlight regression 
analysis as a powerful analytic tool to understand underlying drivers 
of the problem of obesity. It doesn’t solve the obesity conundrum, 
but it shows us where to look for solutions.
We asked one of our research assistants, Bogdan Knezevic, 
a ­Rhodes scholar doing a PhD in genomics and big data analyt-
ics, to test several hypotheses related to obesity at the city level 
using regression analysis. The hypotheses were developed from 
the comprehensive McKinsey Global Institute (MGI) study on obe-
sity.2 ­Bogdan gathered data on 68 US cities, including obesity 
prevalence,3 educational attainment, median household income, 
city walkability,4 and climate comfort score.5 The climate comfort 
score is the suitability of weather to physical activity. It is calculated 
as the sum of temperature and relative humidity divided by four. 
Comfort scores are like Goldilocks’s porridge: You don’t want it 
too hot or too cold but just right with temperature and humidity. 
The data showed that education, income, walkability, and comfort 
score are all negatively correlated with obesity. Bogdan found that 
all the variables except walkability were individually correlated with 
obesity. Perhaps, surprisingly, the comfort index and walkability 
had almost no correlation with each other. Other variables, espe-
cially income and education, are highly correlated with each other 
2MGI Obesity Study, 2013.
3American Fact Finder, https://factfinder.census.gov/faces/nav/jsf/pages/index 
.xhtml.
4Tim Althoff, Rok Sosic, Jennifer L. Hicks, Abby C. King, Scott L. Delp, and Jure 
Leskovec, “Large-Scale Physical Activity Data Reveal Worldwide Activity Inequal-
ity,” Nature 547 (July 20, 2017): 336–339.
5Sperling’s Best Places, www.bestplaces.net.
144	
Big Guns of Analysis
(68%), which can make sorting out relative influence in causation 
more difficult.6
In Exhibit 6.3, individual cities are compared for obesity prevalence 
measured by BMI (body mass index) and household income, with 
comfort scores shown as circles. The correlation between obesity 
and income is clear and large: Income accounts for 71% of the vari-
ance in obesity between cities. The line of best-fit shows that hav-
ing household income at $80,000 versus $60,000 is associated with 
a seven-percentage-point reduction in obesity, over 30% percent.
6The test for multicollinearity, the extent to which one independent variable could 
be linearly predicted from another independent variable, were positive for income 
and education, while others returned negative correlations between the two; both 
variables were retained.
EXHIBIT 6.3 
	
Case Studies for Employing the Big Guns	
145
The best model for capturing obesity differences between cities 
depended on a combination of income, education, comfort, walk-
ability, and an income/education interaction term that accounts 
for the relationship between those two variables. All the variables 
were statistically significant and negatively correlated with obe-
sity. Some 82% of the variance in obesity can be explained when 
all four variables are included, a level of explanatory power that is 
relatively high in our experience. Nonprofits, such as the Robert 
Wood Johnson Foundation, have noted how significant income 
and education factors are in explaining obesity differences in the 
United States.
Multiple regression analysis allows us to combine and control for 
variables as we explore our understanding of the underlying rela-
tionships. For instance, running a linear regression on our data using 
only walkability leads us to conclude that there is no significant cor-
relation between city walkability and obesity rates. ­However, when 
we put both walkability and a comfort score together using multi-
variable regression, we see that walkability is significantly correlated 
with obesity after controlling for weather.
This example is just a simple one to show how regression analysis 
can help you begin to understand the drivers of your problem, and 
perhaps to craft strategies for positive intervention at the city level.
As useful as regression is in exploring our understanding, there are 
some pitfalls to consider:
•	 Be careful with correlation and causation. Walkable cities seem 
to almost always have far lower obesity rates than less walkable 
cities. However, we have no way of knowing from statistics alone 
whether city walkability is the true cause of lower obesity. Per-
haps walkable cities are more expensive to live in and the real 
driver is higher socioeconomic status. Or perhaps healthier peo-
ple move to more walkable communities.
•	 Regression models can be misleading if there are variables that 
we may not have accounted for in our model but that may be 
very important. This model is configured at the city level, and so 
is blind to individual level behavioral or cultural factors.
146	
Big Guns of Analysis
•	 Adding more variables may improve the performance of the 
regression analysis—but adding more variables may then be 
overfitting the data. This problem is a consequence of the under-
lying mathematics—and a reminder to always use the simplest 
model that sufficiently explains your phenomenon.
Bayesian Statistics and the Space Shuttle 
Challenger Disaster
For those who lived through the Space Shuttle Challenger dis-
aster, it is remembered as an engineering failure. It was that of 
course, but more importantly it was a problem solving failure. 
It involved risk assessment relating to O-ring damage that we now 
know is best assessed with Bayesian statistics. Bayesian statistics 
are useful in incomplete data environments, and especially as a 
way of assessing conditional probability in complex situations. 
­Conditional probability occurs in situations where a set of prob-
able outcomes depends in turn on another set of conditions that 
are also probabilistic. For example the probability of it raining will 
vary depending on whether there are clouds in the sky, which itself 
is probabilistic.
Lets look at our Challenger space shuttle example from the Intro-
duction again to see how this analytic approach can help you 
assess risk. O-ring failure under low temperatures was the prob-
able cause of the Challenger space shuttle erupting shortly after 
lift-off.7 Rubber O-rings were used on the Challenger to prevent hot 
gases from leaking and were designed to compress and expand 
with temperature. However questions were raised about the resil-
iency of cold O-rings given the unusually low temperature at launch 
of 31 degrees Fahrenheit, some 22 degrees below the minimum 
on previous launches, coupled with the finding by incident inves-
tigators that a compressed O-ring is five times more responsive at 
75 degrees than at 30 degrees Fahrenheit. In this case the prob-
ability of O-ring failure is (partially) conditional on the probability of 
experiencing a particular temperature range.
7Presidential Commission on the Space Shuttle Challenger Accident, 1986.
	
Case Studies for Employing the Big Guns	
147
Researchers have relooked at the circumstances of the O-ring 
­failure and reached conclusions that substantiate the focus on 
O-rings but relate specifically to the data analysis and problem 
solving undertaken prior to launch on January 28, 1986.8 They argue 
that if ­Bayesian statistics had been employed, and correct sampling 
done, this near inescapable conclusion would have been reached: 
that the probability of failure, given a predicted launch temperature 
of 31 degrees Fahrenheit, was a near certainty.
What made the analysis difficult for engineers at the time was 
that the data they had was for flights where the temperature at 
launch was in the range of 53 to 81 degrees Fahrenheit, when in 
this instance the launch of Challenger was to occur at an unusually 
cold 31 degrees Fahrenheit. They looked at the temperature when 
O-ring damage occurred and noted the level of O-ring thermal dis-
tress that occurred between 53 degrees and 75 degrees. They did 
look at limited data below this temperature range, but couldn’t see 
a clear pattern (Exhibit 6.4). The engineering team reported this 
conclusion to NASA prior to the launch to address concerns that a 
low launch temperature could affect O-rings.
8C. J. Maranzano and R. Krzystztofowicz, “Bayesian Re-Analysis of the Challenger 
O-ring Data,” Risk Analysis 28, no. 4 (2008): 1053–1067.
EXHIBIT 6.4 
148	
Big Guns of Analysis
The data they should have been looking at, however, was the data 
on all flights in relation to temperature and O-ring damage. What 
becomes clear from the data below, when you include all flights 
with no O-ring damage incidents, is a different picture: For tem-
peratures below 65 degrees, all 4 flights had incidents, or 100%! 
Above 65 degrees only 3 of 20 flights, or 15%, had damage inci-
dents. With all the data, the relationship between temperature and 
O-ring ­performance becomes a lot clearer to see (Exhibit 6.5).
Bayesian statistician Professor Sally Cripps of the University of 
­Sydney, a former colleague of Rob’s at the Australian Graduate 
School of Management, has taken this data and combined it with 
a prior probability of failure of 30% (the failure of seven O-rings in 
23 flights). The resulting posterior probability of failure given launch 
at 31F is a staggering 99.8%, almost identical to the estimate of 
another research team who also used Bayesian analysis.
Several lessons emerge for the use of big guns in data analysis 
from the Challenger disaster. First is that the choice of model, in 
EXHIBIT 6.5 
	
Case Studies for Employing the Big Guns	
149
this case Bayesian statistics, can have an impact on ­conclusions 
about risks, in this case catastrophic risks. Second is that it takes 
careful thinking to arrive at the correct conditional probabil-
ity. Finally, how you handle extreme values like launch tempera-
ture at 31F, when the data is incomplete, requires a probabilistic 
approach where a distribution is fitted to available data. Bayesian 
statistics may be the right tool to test your hypothesis when the 
opportunity exists to do ­updating of a prior probability with new 
evidence, in this case exploring the full experience of success and 
failure at a temperature not previously experienced. Even where 
actual Bayesian ­calculations aren’t employed, a Bayesian think-
ing approach (taking account of ­conditional probabilities) can be 
very useful.
Constructed Experiments: RCTs and A|B Testing
Often data we would love to have to shed light on our problem 
just doesn’t exist. Experiments give us a way to make our own data. 
There are lots of advantages to this—in particular, your competi-
tors are sure not to have your data. Let’s take a look at two types 
of experiments that have become popular in the corporate world.
Randomized controlled experiments allow us to test a change in 
one variable while controlling for all other variables. As we saw in 
the obesity example above, maybe it’s not a feature of walkable cit-
ies themselves that makes people less obese. Maybe people who 
are already healthy tend to move to cities that are walkable because 
they like to walk. Experiments avoid this kind of potential mistake in 
understanding causality. But they’re often hard to execute in prac-
tice. We can’t easily make a city more pedestrian friendly and com-
pare it to another city. But when we can set up a good experiment, 
they can have great explanatory power.
Experiments can be useful for evaluating different types of inter-
ventions. For example, a randomized-controlled experiment can 
help you test whether a specific new program offering individuals 
incentives to walk five miles per day reduces obesity better than 
an existing program, controlling for all other factors. Randomized 
150	
Big Guns of Analysis
controlled trials (RCTs) require you to recruit a pool of participants, 
and randomly allocate participants into two or more treatment 
groups and a control group. In this case, the treatment is the new 
exercise incentive program. They work particularly well when you 
want evidence that a specific intervention is the likely cause of a 
change in outcome. By randomly allocating the treatment and 
control groups, you ensure that all other characteristics of this 
group—like demographics, general health status, baseline exer-
cise rates, and diet—vary only at random. When your sample size 
is large enough, no one group should be unbalanced compared 
to the general population. For example, when assigned randomly, 
your exercise-treatment group won’t have more women than men 
compared to your control group. If your treatment group improved 
more than the control, by a statistically significant amount, you 
know that your exercise program, not gender or any other vari-
able, is a strong candidate for explaining the improvement. It 
doesn’t entirely remove so-called confounding factors, but it’s a 
good start.9
Special types of experiments are variations on randomized con­
trolled trials. Market trials are one such special case of experimen-
tal methods, where a new product is tried on a small test market 
before a full roll out. One of the most frequently used experimen-
tal techniques in business today is A/B testing. A/B testing is used 
to make adjustments to product offers in real time. For instance, 
you may want to test the effect of changing the background color 
of your website homepage on the length of time visitors stay on 
your website. An experiment is quick and easy to perform and 
provides evidence for one design over another. An A/B test would 
involve randomly selecting two groups of visitors to your website 
and showing one group (group A) your webpage with the new 
design while the other group (group B) of users, the control group, 
9The Book of Why by Judea Pearl and Dana Mackenzie (Allen Lane, 2018) has a 
good example of confounding factors with the example of the correlation between 
Nobel Prize winners and per capita chocolate consumption of the country they 
come from. Wealthy countries invest more in education and eat more chocolate, 
so the wealth and location of prizewinners are confounders.
	
Case Studies for Employing the Big Guns	
151
sees your old design. You track each group’s usage pattern, and in 
some cases follow up with a survey after they visit the site. You can 
then choose your website homepage color using real data about 
how the design, color, or other variations affect user retention 
times or e-commerce uptake. And because you ran a randomized 
experiment, you know that it’s more likely the design—not other 
­variables—influencing user experience.
A/B Testing
Electronic Arts (EA) recently used an A/B test to explore the impact 
of sales and promotions on the sale of new game releases.10 Driven 
by revenue targets coincident with the release of the next version 
of SimCity, SimCity 5, EA was surprised when the initial advertis-
ing layout of the website with a promotional offer in a headline 
banner were not generating rising pre-orders. Could it be that the 
­pre-order call to action was incorrectly placed? Their team con-
structed several additional variations on the pre-order page and 
randomly exposed the site visitors to the different options, say A/B/
C/D. Option A, without any promotion at all, and Option B with a 
promotional banner, are shown in Exhibit 6.6.
The team concluded that the site with no promotional offer led 
to 43.4% more purchases of the new game edition, a significant 
increase. Here A/B testing allowed them to experimentally explore 
their customers’ responses to sales and advertising. In the pro-
cess they learned that SimCity customers’ decision to purchase 
was not contingent on a promotion. This kind of testing is particu-
larly easy to do in online environments, but can also be employed 
in different cities or at the retail store level to generate similar 
results. ­Real-world experiments are harder when large numbers are 
required to create controls for confounding factors, as is often true 
in healthcare examples, or where it is unethical to expose people 
to experimental choices without their consent. This might lead us 
to look at ­so-called natural experiments.
10https://blog.optimizely.com/2013/06/14/ea_simcity_optimizely_casestudy/.
152	
Big Guns of Analysis
Natural Experiments: Voter Prejudice
Even if a question could be answered by a constructed experiment, 
sometimes you can’t run one. Your turnaround time or budget might 
be too limited, or ethical considerations might rule out experimen-
tation. Governments, for example, often want to understand the 
effects of changing a tax or benefit program. But it is difficult (and 
often illegal) to adjust taxes or social benefits for some groups but 
not for others (the control groups) in a way that would shed light on 
the best course for public policy. How can you collect convincing 
evidence under such constraints?
One answer is the natural experiment, also called a quasi-­
experiment: If you can’t run an experiment yourself, look to see if 
the world has already run it—or something like it—for you. Institu-
tions often make choices that, by accident, create environments that 
can be much like an experiment. Many government programs rely 
EXHIBIT 6.6 
	
Case Studies for Employing the Big Guns	
153
on essentially arbitrary cutoffs or, by some combination of ­history 
and happenstance, treat some geographic areas differently from 
other similar areas. This creates natural affected groups and control 
groups. In the United States, for instance, the national minimum 
drinking age of 21 creates a sharp change in the legal status of 
drinking between people aged 20 years and 364 days and 21 years 
and 0 days. When we can safely compare people just on one side of 
a policy’s cutoff to those on the other side, or areas that were heav-
ily affected by a given intervention to areas that were less affected, 
then we have a natural experiment that can tell us many of the same 
things an actual experiment could.
Natural experiments can be powerful tools, giving us high-­quality 
evidence in environments unsuitable for experimentation. But 
because they are, by definition, not actual experiments, natural 
experiments require more attention to context and potential con-
founding factors that might damage the experimental character of 
the environment. To see how you might use a natural experiment 
to answer a question where actual experiments can’t go and that 
would stump our other problem solving tools, let’s consider one 
example from Evan Soltas, a Rhodes Scholar, and David Broock-
man, a political scientist at Stanford University (now published as a 
Stanford GSB Working Paper). Evan and David’s question was: Do 
voters discriminate against minority candidates in elections?
It’s important, first, to see what methods won’t work to answer this 
question. We can’t simply gather data on white and nonwhite can-
didates for office, calculate the average difference in the number 
of votes they receive, and declare whatever difference exists to be 
“discrimination.” There are potentially many differences between 
white and nonwhite candidates other than race; for instance, whites 
and nonwhites may run for different offices or campaign on differ-
ent platforms. Without an experiment—or something very close to 
one—untying this knot, and distinguishing the independent effect 
of discrimination, is hopeless.
Evan and David found their natural experiment in an obscure, 
unusual procedure in the Illinois Republican presidential primary. 
154	
Big Guns of Analysis
In it, voters cast multiple ballots for delegates selected to ­represent 
presidential candidates at the Republican convention, where a 
candidate is formally nominated. An Illinois voter who supported 
Donald Trump, for instance, couldn’t vote for him in the primary, 
but rather would vote for three delegates who are legally bound to 
attend the convention and support this candidate. The twists that 
create the natural experiment in this case are: first, that these dele-
gates’ names appear on the ballot, even though their identities are 
nearly entirely irrelevant. Most delegates are political unknowns—
so unnoteworthy that many aren’t discoverable on Google, and 
certainly are not known to most voters. Second, voters don’t have 
to vote for all of their favored presidential candidate’s delegates, 
and so delegates for the same candidate need not receive the 
same number of votes to effectively represent the candidate at the 
convention.
Imagine a candidate nominated two presumably-white delegates, 
Tom and Dick, and a presumably-nonwhite delegate, Jose. To sup-
port their candidate fully, his voters should cast ballots for Tom, 
Dick, and Jose. Some voters might subtly discriminate, however, 
by voting for Tom and Dick but not for Jose. If enough ­voters dis-
criminate, then minority delegates like Jose will receive significantly 
fewer votes than non-minority delegates like Tom and Dick; that is, 
relative to delegates who are perfectly comparable in the sense 
that they face exactly the same pool of voters at the same time, and 
are bound to support the same presidential candidate, and differ 
only in their identity as indicated by their name on the ballot. This is 
a great natural experiment!
In the terminology of natural experiments, one delegate is “treated” 
with a likely minority name and is compared against the control of 
two delegates without likely minority names. Evan and David’s Illi-
nois election data, in fact, contained over 800 such experiments. 
What they found was revealing about the extent of prejudice 
among American voters: The delegates with names that suggested 
they were nonwhite received about 10% fewer votes as compared 
to their respective white control delegates.
	
Case Studies for Employing the Big Guns	
155
EXHIBIT 6.7 
156	
Big Guns of Analysis
Exhibit 6.7 shows how Evan and David went from research design—
that is, the idea of their natural experiment—to their statistical 
analysis. While we could, by simple arithmetic, calculate the per-
centage gap between the nonwhite and white delegates in each 
of Evan and David’s experiments, a properly specified independ-
ent variable regression analysis will do such a calculation for us. 
Standard statistical software, such as R, Stata, or various Python 
packages, can easily support regression analyses similar to Evan 
and David’s.
In this analysis, the crucial independent variable was the perceived 
race of delegates. To get the data, Evan and David were entrepre-
neurial: They matched delegates’ last names to a dataset from the 
US Census that provides, for each last name, a share of Americans 
with a last name who are nonwhite. They also paid online workers on 
Amazon’s Mechanical Turk (mTurk) marketplace to guess, without 
further information, the racial background of delegates from their 
names alone, replicating their view of what voters might be doing 
in the privacy of the voting booth. This is a form of crowdsourc-
ing, which we’ll discuss more below. The actual vote counts, their 
dependent variable, came from the Illinois State Board of Elections. 
Knowing where and how to find data, whether from administrative 
releases from the Census or from mTurk surveys, is itself a vital tool 
in your analytical arsenal.
What can go wrong in natural experiments like Evan and David’s? 
Natural experiments rely upon the assumption that treatment and 
control groups are comparable—whereas, in an actual experiment, 
this would be guaranteed by randomizing treatment. Evan and 
David had to rule out differences within groups of delegates like 
Tom, Dick, and Jose other than Jose’s minority status. One poten-
tial confound of this kind would be if minority delegates were less 
likely to hold other public offices than nonminority delegates. Then 
some voters might support Tom or Dick, but not Jose, because 
Tom is their mayor or Dick is their councilman, not because Jose’s 
minority background makes them uncomfortable. A large part of 
the work Evan and David put into their project, Evan said, was in 
addressing such comparability concerns.
	
Case Studies for Employing the Big Guns	
157
It doesn’t mean that you can extrapolate from this analysis to other 
regions or voters; you only know that it’s true and present for the 
precise setting where the data was collected.
Simulations: Climate Change Example
Simulations are computer imitations of what is expected to hap-
pen in the real world. They are powerful because they allow you 
to see many potential states of the world with different input 
assumptions. All you need is a model, some initial conditions, 
and a software program, such as Microsoft Excel, to implement 
a simulation. ­Simulations are often fast and low cost; if you have 
a ­well-configured model—and that is the hard part—they can allow 
you to test ­parameter changes without expensive real-world data 
collection. They can be useful in both branches of our analytical 
tools selection tree.
Simulations are particularly helpful for forecasting the impact of 
policy or parameter change on an outcome of interest, for example 
of climate change or economic outcomes. Given your known model 
(and the source of uncertainty if you have it), changing the value of 
different independent inputs in the model can change the distri-
bution of your results. This is called sensitivity analysis and could 
allow you to use simulations to test the effects of climate change 
on global mean temperatures, and then on economic outcomes at 
the county level, as recently highlighted in The Economist.11 The 
authors of the underlying paper, Hsiang et al, combined a range 
of temperature and other weather outcomes from climate models, 
11The Economist article referenced the work of Hsiang, Kopp, et  al. (“Estimat-
ing Economic Damage from Climate Change in the United States,” Science 
2017) that with each 1 degree Fahrenheit increase the cost of climate change for 
the United States would be an aggregate reduction of .7% of GDP. http://science 
.sciencemag.org/content/356/6345/1362.full?ref=finzine.com%20; “Climate Change 
and Inequality,” The Economist, July 13, 2017, https://www.economist.com/
news/finance-and-economics/21725009-rich-pollute-poor-suffer-climate-change- 
and-­inequality; http://news.berkeley.edu/2017/06/29/new-study-maps-out-­dramatic-
costs-of-unmitigated-climate-change-in-u-s/.
158	
Big Guns of Analysis
with a set of economic models that predict outcomes at the county 
level under different climate scenarios, in a large-scale simulation of 
future impacts of climate change.
The simulation model used by the authors incorporated 44 sep-
arate climate change models, rainfall and temperature weather 
predictions, and uncertainty. They mapped their projections onto 
joint distributions of possible economic outcomes, exploring the 
impacts on labor, violent crime, mortality, rainfall, electricity con-
sumption, temperature, and CO2 at the county level in the United 
States (Exhibit 6.8). To calculate economic costs in terms of GDP, 
they monetized non-market impacts and then aggregated each 
county prediction to the country level. This analysis showed that 
EXHIBIT 6.8 
	
Case Studies for Employing the Big Guns	
159
the negative impacts of climate change are likely to be dispropor-
tionately felt by counties that are already poor. Climate-change 
analysis, like this one, exhibits one of the main strengths of simula-
tions rather than actual experiments. In the case of climate, we can-
not wait for global temperatures to increase to explore the effects, 
rather we want to simulate possible future effects reliably now in 
an effort to mitigate and prevent irreversible damage. Simulations 
work best when you have well configured and tested underlying 
models, and where your simulations are testing projected ranges in 
line with the underlying ranges of the original data.
Machine Learning Solutions
Machine learning techniques are at heart very similar in concept to 
traditional statistical tools like multiple regression. They often per-
form much better than these traditional techniques when there is a 
large amount of data in the right format, and when there are more 
complex patterns and interactions in the data. These tools have 
caught on, particularly in the past several years, because comput-
ing power has grown and is available at reasonable cost to manage 
large datasets and sophisticated learning algorithms. Learning a 
simple scripting language such as Python or R allows you to begin 
using state-of-the-art machine learning tools, and it is within the 
capabilities of many teams.
Let’s look at the problem of classifying whether an individual is at high 
or low risk of becoming obese. If you have large amounts of data—
perhaps walking records from individuals’ mobile phones, demo-
graphics, and health information—and information about what 
profiles in this population went on to develop obesity, you allow the 
machine learning algorithm to learn how to identify ­hallmark signs 
of obesity risk from the data. Unlike with linear regression, you’re 
less concerned here about identifying and measuring the specific 
variables that indicate disease risk (although you can often infer 
these using machine learning) as you are about building a learning 
160	
Big Guns of Analysis
model that can make accurate predictions. With these techniques 
you’re often less involved in the learning process: Instead of select-
ing which variables to use, you often allow the computer algorithm 
to select the correct combination of features. With the right amount 
of data, machine learning can often outperform traditional statisti-
cal techniques for prediction.
We now turn to examples of machine learning that are producing 
outcomes that save lives and resources. We have selected one in the 
field of medicine, one that relates to education, and one in the field 
of drone technology to illustrate the diversity of ­machine-learning 
applications in problem solving.
Can a Computer Predict the Onset of Sleep Apnea Better 
Than Doctors Can?
One of the reasons machine learning has gained so much traction 
is because of its demonstrated ability to make predictions that 
are better than human judgment in particular domains. Oxford 
doctoral students Logan Graham and Brody Foy, cofounders of 
the Rhodes Artificial Intelligence Lab, a student-led organization 
dedicated to solving social problems with machine learning, spear-
headed the development of a machine-learning model that out-
performed expert doctors at predicting whether children would 
go on to develop sleep apnea within 6 to 12 months from clinical 
examination. The tool used data from a simple questionnaire con-
taining information on demographics, patient BMI, and co-morbid 
diseases like asthma and acid reflux to make predictions that con-
sistently outperformed clinicians by upwards of 20% in accuracy. 
Logan speculates that the model might succeed by shortcutting 
biases in doctors’ decision-making processes or by considering rel-
evant combinations of predictive features that medical practition-
ers might overlook. The model they developed takes into account 
the general population while practitioners work patient by patient. 
The algorithm showed marked success even on a relatively small 
sample of just over 400 patient records. Conventional diagnosis of 
sleep apnea requires patients to undergo costly and invasive sleep 
	
Case Studies for Employing the Big Guns	
161
studies. A predictive model that reduces false positive screens 
could save patients and doctors considerable time and money.
Logan notes that machine learning works very well for problems 
that involve predicting future outcomes. However, he also cau-
tions that prediction problems require a dataset that matches 
the ­general population distribution. The sleep apnea data was 
drawn from patients who had already been flagged by their 
­clinicians as being at risk of a sleep disorder. Because of this, a 
different and larger dataset would be required to make robust 
predictions if the tool were to be used on the general public. 
The important point here is that machine learning is predicting 
an outcome, not understanding the solution or how a decision 
is being made.
Routing School Buses with Computers
A group of MIT researchers developed an algorithm that saved 
the Boston Public School System $5 million by optimizing school 
bus routes for 30,000 students. Previously, school administrators 
designed bus routes by hand, a laborious process that took weeks 
every year. The MIT algorithm runs in minutes and eliminated a num-
ber of routes to 230 different schools, which used to be ­serviced by 
650 school buses.
Bus routing is an example of a problem where investing in the crea-
tion of a computational tool upfront can save time and money in 
the long run. The algorithm automates the process of bus routing, 
a process that humans can do with their own intuition, but is so 
computationally intensive that it can be better served by relying 
on a mathematical process. It’s a problem well suited to automa-
tion. The routing system will need to be run year after year, but the 
underlying decision-making engine need not change each time it 
is used. There’s no real need for human decision making here, and, 
if anything, human oversight would hamper the decision process. 
We have objective external criteria that we can use to assess the 
effectiveness of the algorithm.
162	
Big Guns of Analysis
Shark Spotting from Drones
Shark attacks are a real and perceived danger on many beaches 
around the world. Netting is often put in place to reduce the risk of 
shark attacks but at considerable financial cost and species loss due 
to entanglement. A solution is emerging on Australian beaches by 
a company called the Ripper Company that Rob is involved with, 
a company we shall discuss in more detail in Chapter 8. The solution 
involves the combination of camera-carrying drones and machine 
learning. The inspiration for shark spotting via machine learning 
came from Australian publisher Kevin Weldon, who was the first 
president of International Surf Life Saving, and Paul Scully Power, 
Australia’s first astronaut.
Here’s how it works. Drones patrol the beach and transmit video to 
the operations center. Together with machine learning experts at 
the University of Technology Sydney (UTS), the Ripper Company 
developed a shape-interpreting algorithm, the first of its kind, 
which predicts the presence of a shark, as distinct from porpoises or 
humans. When a shark is detected by the algorithm and confirmed 
by an operator, the beach patrols alert swimmers and clear the 
water until such time as the drone surveillance confirms no ­further 
sightings on the beach.
The algorithm has a mean average precision (MAP) of 90.4% detec-
tion, using true-positives and false-positives for the calculation. 
Precision here relates to how many correct images of sharks are 
identified from the total images (Exhibit 6.9). This is an impressive 
result. But it leaves open the question of false negatives—how many 
sharks aren’t spotted (which seems important!)—but the ability to 
detect with high precision other species like dolphins is thought to 
minimize the number of false negatives. Like other deep-learning 
algorithms, the expectation is that results will improve further with 
additional data.12 In addition, trialing technology, such as multi-
spectral cameras, is expected to provide better ocean penetration, 
particularly for cloudy days.
12Communication with Paul Scully Power AM, CTO, The Ripper Company.
	
Case Studies for Employing the Big Guns	
163
The beach of the future, as The Ripper team pictures it, will incor-
porate three technologies:
1.	 A drone tethering system that allows the drone to be pow-
ered and sit atop a cable with full view of the beach, able to 
operate 24/7, but most likely for the hours the beach has 
­lifeguards on duty.
2.	 A machine learning algorithm linked to the drone video to pro-
vide an alert that a shark is within proximity of surfers.
3.	 A drone payload called a shark shield® that can be dropped to a 
surfer close to a shark. The shark shield® emits electronic pulses 
that cause the shark to experience temporary muscle spasms 
and turn away from the electronic field.
As you can see from these examples, machine learning works well 
when you want to produce a very accurate model or optimization 
path, and when you care less about understanding key variables 
that influence the decision-making process. This tends to be most 
useful when you already have an understanding of the decision-
making mechanism, but it’s complex, and you have lots of diverse 
data examples. Machine learning neural networks can produce 
shark
shark
surfer
EXHIBIT 6.9 
164	
Big Guns of Analysis
impressive results by automating complex processes like human 
vision for pattern recognition. But many business decisions lack the 
sheer amounts of high-quality data required to employ ­learning 
algorithms.13 Some business and life decisions require subjective 
intuitions about past events and future issues unavailable in data, or 
involve guessing the responses of other players. Could you imagine 
delegating your decision to a machine about which city to move to, 
an algorithm that made the decision based on carefully ­weighing 
the preferences of thousands of other individuals and consider-
ing your situation? Clearly not—though you might be interested in 
­seeing the results.
Crowdsourcing Algorithms
Besides doing sophisticated analysis within your own team, we now 
have the ability to go outside the organization to harness more 
analytic power. Enter crowdsourcing as a way to pair enterprises 
searching for solutions with teams of individuals that have ideas 
for implementation. Participants often compete for a prize to solve 
challenging problems, which previously required the contracting of 
consultants and experts. Often problem solving competitions are 
presented at hackathons, daylong events where programmers and 
analysts compete for the best solution given the data available to 
solve the problem at hand.
Kaggle is one such platform that hosts competitions. The range of 
prizes, challenges, and entrants is quite remarkable. Here are some 
recent ones.14
1.	 A challenge by the US Department of Homeland Security to 
generate a passenger-screening algorithm for a $1.5 million 
prize attracted 518 teams.
13Machine learning is as powerful and weak as the data used. If a model has sig-
nificant errors—and we have seen examples of 10% or more errors in data sets—it 
inherently embeds all the biases of that data into its predictive efforts.
14Kaggle website.
	
Case Studies for Employing the Big Guns	
165
2.	 Real estate company Zillow requested a model that would pre-
dict home value, rewarding $1.2 million to the winning team 
from a field of 3779 teams.
3.	 Predicting borrower default: 924 teams competed for a $5,000 
prize to assess data on 250,000 borrowers and come up with the 
best predictive algorithm for the probability that a person will 
experience financial distress in the next two years.
4.	 Identifying fish species from cameras on fishing boats to esti-
mate fish catch and fish stocks, in a contest format set up by 
The Nature Conservancy, where Rob is an Asia Pacific trustee. 
The prize of $150,000 attracted 293 teams around the world.
5.	 Predicting survival on the Titanic using machine learning: Over 
10,000 teams entered the competition and were provided data 
on ship manifests, passengers, and survivors.
The Good Judgment Project is an example of applying crowdsourc-
ing to decision making at a large scale.15 Philip Tetlock, its founder, 
developed the project and website around the principle of the 
­wisdom of the crowd. If enough people weigh in on a particular 
forecast, they’ll cancel out any individual contributor’s biases and 
come to more accurate conclusions than a single forecaster would. 
This is a lot like when a crowd of people guess the number of mar-
bles in a jar: A single guess may be very far from correct, but when 
enough people’s guesses are pooled, deviations are canceled out 
and the crowd usually comes to the right conclusion. Forecasts 
were surprisingly accurate for major and sometimes very specific 
world events, including predicting military invasions. The best con-
tributors are dubbed superforecasters, and the entire ­process is 
described in the book Superforecasting.16
Exhibit 6.10 shows a decision tree to help determine whether to 
use a crowdsourcing competition over other methods (such as an 
expert contract). It takes into account whether there is an ­achievable 
15Philip E. Tetlock and Don Gardner, Superforecasting: The Art and Science of Pre-
diction (Crown Publishing, 2015).
16Tetlock and Gardner, Superforecasting.
166	
Big Guns of Analysis
goal, whether there are few or many resources available, and the 
willingness to take risks and incur costs. Not surprisingly, there 
have been entries on Kaggle, including finding a cure for malaria, 
with a large prize that wasn’t collected. You can see how it turned 
out not to be an achievable goal in the short term as few were in 
a position to believe they could win and the risks and costs were 
deemed to be large.
Elon Musk’s Hyperloop project is an attempt to rapidly advance 
transportation technology. The Hyperloop is a pod transportation 
system currently under development, designed to transport peo-
ple over long distances at astonishing, near supersonic speeds. 
Given its clear, well-defined goal, and a large, diverse population of 
problem solvers, many of whom are students willing to accept the 
EXHIBIT 6.10 
Source: Jonathan Bays, Tony Goland, and Joe Newsum, “Using Prizes to Spur 
Innovation,” McKinsey Quarterly, July 2009.
Case Studies for Employing the Big Guns	
167
risk and hungry for the experience, the SpaceX Hyperloop competi-
tion is a great example to test the power of crowdsourcing. With an 
available testing track at its disposal, SpaceX ran its Hyperloop Pod 
Competition in January 2017. By hosting a competition they were 
able to increase the quantity of prototypes being simultaneously 
explored. The jury is still out on Hyperloop as a viable concept, 
but the process is harnessing resources in a way not seen even a 
decade ago.
Game Theory Thinking
The analytic big guns we have discussed so far are based largely on 
statistical techniques. One of the other powerful tools in your tool-
box for complex problems is game theory. Competitive situations 
in business and life mean that your actions influence and are influ-
enced by another player, for these purposes called an adversary or 
opponent. For instance, your strategy has to consider your choices 
to compete aggressively or collaborate (where that is allowed under 
competition law). These strategic moves are sometimes played out 
over hours, days, or years. We employ game theory thinking to work 
through our own choices and competitor choices, set out in a logic 
tree. To assess how we should respond to an opponent’s moves, 
we typically create a simulation in which we break the team into 
an attack team and a defense team, and make a series of moves 
that the other team has to respond to. We may cover as much as 
18 months of moves in a one-day workshop. Then we reconvene 
and have the business-unit leader reflect on the moves and coun-
termoves, and the likely payoffs from each pursuing their best 
strategies. Game theorists use terms like minmax and maxmin to 
describe strategies where you choose an outcome that maximizes 
your minimum gain or conversely minimizes your maximum loss. 
These are constructs for formal games that go beyond the scope 
of what we are able to share in this book, which involve putting 
yourself in an opponent’s shoes and crafting competitor responses. 
This is the right tool to use in difficult competitive and adversarial 
problem solving settings.
We illustrate game-theory thinking with two different examples, an 
example from business (should you go to court?), and an individual 
one: Where should I serve in tennis?
168	
Big Guns of Analysis
Should We Go to Court? CSIRO Wifi Example
If you ask a businessperson the question, “Should we go to court?” 
the answer is typically “no.” Going to court involves uncertain-
ties about outcomes, lengthy periods of executive time in court, 
and substantial costs. But there are times when it makes sense, 
and game-theory thinking is a useful framework to help make this 
decision. Let’s consider the case of a successful defense of a wifi 
­patent by a small Australian government research organization 
called CSIRO against the world’s largest technology companies, 
including Microsoft, Intel, Dell, and HP. It’s a story that played out 
over more than decade in a series of passive and then increasingly 
aggressive moves by the parties. This strategy resulted in $400m of 
­payments to CSIRO, which was used to fund additional research in 
the ­Australian national interest.
CSIRO believed that its wifi technology was valuable, that its patent 
was being infringed, and that it was entitled to receive a reason-
able fee for use. The giant tech companies who were using this 
technology, on the other hand, believed the right transfer price was 
zero for many reasons, including that CSIRO was a publicly funded 
research agency. In a CSIRO briefing to the US government, it was 
reported this way: “CSIRO tried to license this product. In 2003 and 
2004, it became aware of products that it believed infringed on its 
patent, and sent letters to 28 companies asking them to please dis-
cuss terms for a license from CSIRO. The companies did not accept 
CSIRO’s offer.”17
CSIRO had to decide whether to pursue its case in the courts or 
not. Doing so, it faced formidable companies in computing and 
networking with deep pockets and deep experience in patent 
fights. Besides the cost of legal action and uncertainty of a favora-
ble ­outcome, CSIRO faced potential costs from being countersued 
by the tech companies. On the other hand, not defending its pat-
ent set a precedent for any future licensing deals it might seek to 
do in the United States.
17CSIRO briefing to US government, December 5, 2006, https://wikileaks.org/
plusd/cables/07CANBERRA1721_a.html.
	
Case Studies for Employing the Big Guns	
169
Here’s how they reached the decision to go to court. The execu-
tive director of Business Development and Commercialization 
for CSIRO at the time of the decision, Mehrdad Baghai, a former 
colleague of Charles and Rob, put it this way: “Going back to the 
beginning, we first of all had to satisfy ourselves that we had a claim 
that we could pursue. That involved spending about $1 million to 
get some preliminary expert advice. Then we estimated what we 
could expect to receive if our claim succeeded in court. I felt it was 
upwards of $100 million and possibly over $1 billion. To get there 
meant we needed to commit $10 million to the initial court action. 
As a back of the envelope calculation, we needed a 10% probabil-
ity of winning. I felt we had that, easily. I also felt we had a fallback 
option in the event of costs blowing out, that was an abandonment 
option, the option to sell all or part of the claim to a group that 
specializes in intellectual property litigation.”18 Having got to the 
point of being prepared to go to court, here’s how they used game 
theory thinking to win.
In competitive strategy for business, the cleaving lines are often 
around where and how to compete. Strategies are often depicted 
contrasting competitor choices about market segments, and 
whether they compete on cost or value. CSIRO’s defense of its 
patent for wifi provides an example of how strategy plays out over 
time, in a series of moves designed to learn more about competi-
tor intentions, and to position their own moves for the highest level 
of success.
CSIRO’s strategy for how to compete went from an unsuccessful 
passive approach of letter writing to ask for voluntary licensing of 
its technologies, to suing the big tech giants. Even more dramatic 
was their strategy about where to compete. CSIRO had to decide 
which players it should target initially (Exhibit 6.11). It chose to sue 
a small to medium networking company called Buffalo Technology 
for patent infringement in what has been described as a test case. 
Buffalo was a ­Japanese company rather than a US giant, with less 
experience in US patent cases, and at that time it had an almost 
complete reliance on networking technology that was transitioning 
18Private communication with Mehrdad Baghai.
170	
Big Guns of Analysis
rapidly to wifi. CSIRO’s advisers reviewed the record of patent liti-
gation in the US to assess their chances of success. They noted 
that the Federal Court for the Eastern District of Texas had a much 
higher success rate for patent holders, and that the time to court for 
plaintiffs was much faster than for other jurisdictions. For the period 
1995–2014, which includes the wifi case, the success rate for plain-
tiffs in Texas Eastern was 55% compared to 33% overall. They also 
took note of the fact that trial success rates for plaintiffs with juries 
were higher than for the judicial bench; for the period 2005–2009 
they were 77% compared to 58% for the bench.19
Following CSIRO lodging the suit against Buffalo Technology, coun-
tersuits were lodged by other patent infringers, including Intel, HP, 
EXHIBIT 6.11 
19PriceWaterhouse Coopers, Patent Litigation Study: A Change in Patentee 
­Fortunes, 2015.
	
Case Studies for Employing the Big Guns	
171
Microsoft and Dell. CSIRO had to decide what to do in response 
to this aggressive action. CSIRO responded the following year 
by adding another eight companies to its infringement list. Soon 
CSIRO was facing 14 companies in a jury trial. Their nerve lasted 
and HP settled first, followed by the 13 others for $205 million. The 
action CSIRO brought in 2009 against ATT, Verizon, and T Mobile 
was settled before trial in 2012 for an additional $220 million, a year 
before the patent was due to expire!
Decisions to go to court require a problem solving approach that 
takes into account how an adversary will respond. In this case 
CSIRO was smart to pick a weak adversary in a favorable court to 
demonstrate its patent, and then it chose to fight larger players 
from a stronger position. Furthermore, CSIRO had decided they 
could afford to lose $10 million to put themselves in the game.
Where to Serve in Tennis: Game Theory Example
Many of us play tennis and, as a result, engage in competitive strat-
egy. Barry Nalebuff, a game theorist at Yale Management School, 
has analyzed where to serve in tennis with fellow strategist Avinash 
Dixit.20 Their answers are simple and powerful. The recommenda-
tions are to remove predictability by making each serve appear 
­random, and to place your serves to your opponent’s forehand 40% 
of the time and to their backhand 60% of the time. The analysis 
was described for two types of serve, to the opponent’s ­forehand, 
and to their backhand, and where the receiver anticipated one 
serve or the other. The likelihood that your opponent success-
fully returns serve is highest if you serve to their forehand and he 
or she anticipates this by moving to the right place. Nalebuff and 
Dixit ­prepared a payoff table to reach this conclusion that we show 
below (Exhibit 6.12). You read it as follows:
•	 If you serve to your opponent’s forehand and they anticipate it, 
they will return the serve 90% of the time.
•	 If you serve to their forehand and they do not anticipate it, they 
will only return successfully 30% of the time.
20Avinash K. Dixit and Barry J. Nalebuff, Thinking Strategically (W.W. Norton, 1991).
172	
Big Guns of Analysis
•	 If you serve to their backhand and your opponent anticipates it, 
they will return the serve 60% of the time (assuming their back-
hand side is weaker, as it is for most amateur players).
•	 If you serve to their backhand and they do not anticipate it, they 
will only return 20% of the time.
Rob took these findings to heart and tried to apply them to his own 
game, where he is an amateur lefthander who plays mostly on grass 
or synthetic grass.
EXHIBIT 6.12 
Source: Avinash K. Dixit and Barry J. Nalebuff, Thinking Strategically (W.W. 
Norton, 1991).
	
Case Studies for Employing the Big Guns	
173
Since Nalebuff and Dixit’s Thinking Strategically was published in 
1991, there has been a big change in tennis racket technology and 
as a result, serving power. Commentators now talk about three 
types of serve: wide, to the body, and down the T (see Exhibit 6.13). 
When you watch top players receiving serve today they position 
themselves in a 45-degree line to the server and don’t do much 
anticipating, just find a position that gives the best chance of return-
ing a serve from all three places. Does this invalidate Nalebuff and 
Dixit’s conclusion that the server needs genuine unpredictability 
of each serve, and that the serves should be in a 40/60 mix? Rob 
wanted to know.
Data analytics comes in to help us with this question. Since the use 
of Hawkeye technology for line calls, we can analyze what serv-
ers actually do in serving and measure predictability. We can also 
link it to what analysts call important points or clutch points—that 
EXHIBIT 6.13 
174	
Big Guns of Analysis
is at 30–40 and Advantage out, which are always served to the Ad 
court. GameSet MAP reviewed the 2012 Olympics final between 
Andy Murray and Roger Federer using GIS technology. This was 
a match Murray won. They noted that Murray served with more 
spatial variation (less predictability) on clutch points than Federer, 
and that he directed seven of eight serves wide to Federer’s 
backhand.21 That doesn’t sound unpredictable, but he was serv-
ing to Federer’s backhand, his weaker side. The unpredictability 
came from mixing one serve in another direction to sow a seed 
of doubt. On clutch points left handers will serve to the Ad court 
predominantly because they have the advantage in serving the 
big carving wide serve to the backhand of a right hander. It’s a 
weapon, so you use it. Rafael Nadal will go wide probably two-
thirds of the time on the advantage side, but mix up body and 
T-serves with the rest.
Game-theory problems can be set out as decision trees as well as 
payoff matrices. We have put the factors described above into a 
tree to help Rob think about what he should do in deciding where 
to serve. We start with whether the server is left or right handed, 
whether the opponent is left or right handed, whether the oppo-
nent is stronger on the forehand than backhand and whether the 
serve is to the Deuce court or the Ad court. We stopped the tree 
there as it captures the essence of the game. (We could have added 
two other branches for completeness: whether it is a clutch point 
or a regular point, and whether it is a first or second serve). The mix 
that results is shown in Exhibit 6.14. We show only two cases: a right 
hander serving to a right hander, like Federer versus Murray, and 
a left hander serving to a right hander, like Nadal versus Federer. 
The percentages are in effect conditional probabilities. They show 
considerable variation depending on the opponent and whether 
you’re serving on the deuce court or ad court. This analysis con-
cludes that it is no longer a simple 40/60 mix as per the two-serve 
place example, but one with a richer mix.
21GameSet Map, February 19, 2013.
	
Case Studies for Employing the Big Guns	
175
So the tennis greats are lined up at the baseline ready to serve with 
their own algorithm based on these factors, plus the importance of 
the point, and whether it’s first or second serve. The conclusion of 
Thinking Strategically, to make each serve appear random remains 
a sound one, albeit with lesser unpredictably to take advantage 
of your strengths and opponents weaknesses. This is the key aim 
of every game theorist. The conclusion we reach about serve 
direction is conditional on three to five questions. When you’re 
standing at the service line, you have to quickly take these factors 
into consideration. The result is a mixing strategy as the authors 
EXHIBIT 6.14 
176	
Big Guns of Analysis
of Thinking Strategically argued, but clear preference in the left-­
hander’s case for the backhand side on clutch points and first serves. 
Take the tree and place yourself on it and figure out how you should 
serve on important points to a regular opponent in singles.
Complex problems often require the big analysis guns we have 
described. We have examined the sophisticated tools now avail-
able to problem solvers. We expect them to be employed more 
in the future as more large data sets become available, as experi-
ments become cheaper, and as software packages and scripting 
languages become more widely used. Remember to start your 
analysis with time-tested heuristic short cuts, simple statistics, 
and root-cause analysis before taking on sophisticated tools. This 
initial step may lead you to the decision that these more sophis-
ticated tools aren’t needed for your problem situation, and will 
in any case give you important information on advanced tools 
to employ.
Takeaways
•	 Getting to a solution for many complex problems means you 
will need to be aware of and know how to use sophisticated 
­analytic tools.
•	 The starting point is always to get a thorough understanding of 
your data through graphing, visualization, and summary statistics.
•	 Which advanced tool you use is often dictated by whether you 
are seeking to understand drivers and develop an intervention 
strategy, or predict outcomes and plan accordingly.
•	 Experiments are a powerful and often overlooked tool in the big 
gun arsenal; if you can’t make one, sometimes you can find a 
natural experiment.
•	 Machine learning is emerging as a powerful tool in many problem 
spheres; we argue to understand problem structure and develop 
hypotheses before employing deep learning algorithms (huge 
mistakes can come from bad data and bad structuring, and these 
models offer little transparency).
	
Problems to Try on Your Own	
177
•	 You can outsource problem solving, including deep learning, 
through crowdsourcing on platforms such as Kaggle.
•	 Where there is an adversary whose behavior many change in reac-
tion to your choices, you can look to game theory approaches 
with logic trees to work out the best course of action.
Problems to Try on Your Own
1.	 What big gun would you select for understanding causes of 
mental-health problems using the framework in Exhibit 6.1?
2.	 Set out how you would predict Olympic games medals for the 
top five countries at the next Olympics.
3.	 How would you test effectiveness of social media campaigns 
using experiments in your business or nonprofit?
4.	 How would you set out the logic tree to decide whether to take 
a competitor to court where you believe they have appropri-
ated your IP?

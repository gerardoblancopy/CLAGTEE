
import React from 'react';
import { motion, Variants } from 'framer-motion';
import { appData } from './data/content';
import { Navbar } from './components/Navbar';
import { Header } from './components/Header';
import { Section } from './components/Section';
import { ImportantDatesCard } from './components/ImportantDatesCard';
import { BookCoverCard } from './components/BookCoverCard';
import { ChevronRightIcon } from './components/icons';
import { Footer } from './components/Footer';
import { CMSLayout } from './src/cms/CMSLayout';
import { AuthorDashboard } from './src/cms/AuthorDashboard';
import { AuthProvider, useAuth } from './src/cms/AuthContext';
import { LoginScreen } from './src/cms/LoginScreen';
import { ChairDashboard } from './src/cms/ChairDashboard';
import { ReviewerDashboard } from './src/cms/ReviewerDashboard';
import { SubmissionForm } from './src/cms/SubmissionForm';
import { CMSDataProvider, useCMSData } from './src/cms/CMSDataContext';

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const fadeInUpItem: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8, ease: 'easeOut' } },
};

const CMSContainer: React.FC<{ 
  onLogout: () => void 
}> = ({ onLogout }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { createPaper } = useCMSData();
  const [activeCmsTab, setActiveCmsTab] = React.useState('submissions');

  React.useEffect(() => {
    if (!user) return;
    if (user.role === 'reviewer') {
      setActiveCmsTab('reviews');
    } else if (user.role === 'chair') {
      setActiveCmsTab('admin');
    } else {
      setActiveCmsTab('submissions');
    }
  }, [user]);

  if (!isAuthenticated || !user) {
    return <LoginScreen onBack={onLogout} />;
  }

  return (
    <CMSLayout 
      user={user}
      activeId={activeCmsTab}
      onNavigate={setActiveCmsTab}
      onLogout={() => {
        logout();
        onLogout();
      }}
    >
      {activeCmsTab === 'submissions' && (
        <AuthorDashboard onNewSubmission={() => setActiveCmsTab('new-submission')} />
      )}
      {activeCmsTab === 'new-submission' && (
        <SubmissionForm 
          onCancel={() => setActiveCmsTab('submissions')} 
          onSubmit={async (payload) => {
            if (!user) return;
            const created = await createPaper(payload, user);
            if (!created) {
              alert('No se pudo enviar el trabajo. Intenta nuevamente.');
              return;
            }
            alert('¡Trabajo enviado con éxito!');
            setActiveCmsTab('submissions');
          }} 
        />
      )}
      {activeCmsTab === 'reviews' && <ReviewerDashboard />}
      {activeCmsTab === 'admin' && <ChairDashboard />}
    </CMSLayout>
  );
};

const AppContent: React.FC = () => {
  const { designSystem, content } = appData;
  const [view, setView] = React.useState<'web' | 'cms'>('web');

  const CommitteeMember: React.FC<{ name: string; affiliation: string }> = ({ name, affiliation }) => (
    <div className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow h-full">
      <div className="mx-auto bg-gray-200 h-24 w-24 rounded-full mb-4 flex items-center justify-center">
         <span className="text-gray-500 text-sm">Foto</span>
      </div>
      <h4 className="font-bold text-[#0D2C54]">{name}</h4>
      <p className="text-sm text-gray-500">{affiliation || ' '}</p>
    </div>
  );

  if (view === 'cms') {
    return <CMSContainer onLogout={() => setView('web')} />;
  }

  return (
    <div className="bg-white flex flex-col h-full" style={{ fontFamily: designSystem.typography.fontFamily.body }}>
      <Navbar navItems={content.navigation} onCmsClick={() => setView('cms')} />
      <Header heroContent={content.sections.hero} />
      {/* ... resten del main ... */}

      <main className="flex-grow bg-white">
        <Section id="acerca-de" title={content.sections.presentation.title} contentClassName="!max-w-6xl">
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
            >
                <motion.div variants={fadeInUpItem} className="space-y-4 text-lg leading-relaxed text-gray-700 font-['Roboto']">
                    {content.sections.presentation.body.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                    ))}
                </motion.div>
                <motion.div variants={fadeInUpItem}>
                    <h3 className="text-2xl font-bold text-[#0D2C54] mb-6 font-['Montserrat']">
                        {content.sections.chronology.title}
                    </h3>
                    <div className="space-y-2 text-gray-600 font-['Roboto'] border-l-2 border-[#F4A261] pl-4">
                        {content.sections.chronology.events.map((event, index) => (
                            <p key={index} className={`text-sm py-1 ${event.startsWith('XVI') ? 'font-bold text-[#0D2C54]' : ''}`}>
                                {event}
                            </p>
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </Section>
        
        <Section id="fechas" title={content.sections.importantDates.title}>
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            {content.sections.importantDates.dates.map((item, index) => (
              <motion.div key={index} variants={fadeInUpItem}>
                <ImportantDatesCard item={item} index={index} />
              </motion.div>
            ))}
          </motion.div>
        </Section>

        <Section 
          id="ejes" 
          title={content.sections.thematicAxes.title} 
          className="bg-gray-100 py-16 md:py-24"
          contentClassName="!max-w-7xl"
        >
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            {content.sections.thematicAxes.tracks.map((track, index) => (
              <motion.div 
                key={track.id}
                variants={fadeInUpItem} 
                className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 md:p-8 h-full flex flex-col hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs tracking-[0.2em] font-semibold text-[#0D2C54] uppercase">{track.id}</span>
                  <div className="h-1 w-16 bg-gradient-to-r from-[#F4A261] via-[#2A9D8F] to-[#0D2C54] rounded-full" />
                </div>
                <h3 className="text-xl font-bold text-[#0D2C54] leading-snug">{track.title}</h3>
                <p className="mt-3 text-gray-600 italic">{track.scope}</p>
                <ul className="mt-4 space-y-2 text-gray-700">
                  {track.topics.map((topic, topicIdx) => (
                    <li key={topicIdx} className="flex items-start space-x-3">
                      <ChevronRightIcon className="h-5 w-5 text-[#2A9D8F] mt-0.5 flex-shrink-0" />
                      <span className="font-['Roboto']">{topic}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </Section>

        <Section
          id="envio"
          title={content.sections.callForPapers.title}
          contentClassName="!max-w-5xl"
        >
          <motion.div
            className="space-y-10 text-gray-700 font-['Roboto']"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div variants={fadeInUpItem} className="space-y-4 text-lg leading-relaxed">
              {content.sections.callForPapers.intro.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </motion.div>

            <motion.div variants={fadeInUpItem} className="space-y-4">
              <h3 className="text-2xl font-bold text-[#0D2C54]">
                {content.sections.callForPapers.submissionDates.title}
              </h3>
              <p className="text-base leading-relaxed">
                {content.sections.callForPapers.submissionDates.window}
              </p>
              <p className="text-base leading-relaxed">
                {content.sections.callForPapers.submissionDates.process}
              </p>
              <p className="text-base leading-relaxed">
                {content.sections.callForPapers.submissionDates.notification}
              </p>
            </motion.div>

            <motion.div variants={fadeInUpItem} className="space-y-4">
              <h3 className="text-2xl font-bold text-[#0D2C54]">
                {content.sections.callForPapers.guidelines.title}
              </h3>
              {content.sections.callForPapers.guidelines.body.map((paragraph, index) => (
                <p key={index} className="text-base leading-relaxed">
                  {paragraph}
                </p>
              ))}
              <ul className="list-disc pl-5 space-y-2 text-base">
                {content.sections.callForPapers.guidelines.structure.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              <p className="text-base leading-relaxed">
                {content.sections.callForPapers.guidelines.translationNote}
              </p>
            </motion.div>

            <motion.div variants={fadeInUpItem} className="space-y-4">
              <h3 className="text-2xl font-bold text-[#0D2C54]">
                {content.sections.callForPapers.reviewCriteria.title}
              </h3>
              <p className="text-base leading-relaxed">
                {content.sections.callForPapers.reviewCriteria.body}
              </p>
              <ul className="list-disc pl-5 space-y-2 text-base">
                {content.sections.callForPapers.reviewCriteria.criteria.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </motion.div>

            <motion.div variants={fadeInUpItem} className="space-y-4">
              <h3 className="text-2xl font-bold text-[#0D2C54]">
                {content.sections.callForPapers.publicationConditions.title}
              </h3>
              <p className="text-base leading-relaxed">
                {content.sections.callForPapers.publicationConditions.body}
              </p>
            </motion.div>

            <motion.div variants={fadeInUpItem} className="space-y-4">
              <h3 className="text-2xl font-bold text-[#0D2C54]">
                {content.sections.callForPapers.styleInstructions.title}
              </h3>
              {content.sections.callForPapers.styleInstructions.body.map((paragraph, index) => (
                <p key={index} className="text-base leading-relaxed">
                  {paragraph}
                </p>
              ))}
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Plantilla</th>
                      <th className="px-4 py-3 text-left font-semibold">Vinculo de descarga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.sections.callForPapers.styleInstructions.templates.map((template, index) => (
                      <tr key={template.label} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 border-t border-gray-200">{template.label}</td>
                        <td className="px-4 py-3 border-t border-gray-200">
                          <a
                            href={template.href}
                            className="text-[#2A9D8F] font-bold hover:underline"
                          >
                            DESCARGAR
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-base leading-relaxed">
                {content.sections.callForPapers.styleInstructions.footnote}
              </p>
            </motion.div>
          </motion.div>
        </Section>

        <Section
          id="inscripcion"
          title={content.sections.payments.title}
          className="bg-[#0D2C54] py-16 md:py-24"
          titleClassName="text-white"
          contentClassName="!max-w-2xl"
        >
          <motion.p
            className="text-center text-lg leading-relaxed text-gray-300 font-['Roboto']"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeIn}
          >
            {content.sections.payments.body}
          </motion.p>
        </Section>

        <Section id="conferencistas" title={content.sections.speakers.title} className="bg-gray-100 py-16 md:py-24">
          <motion.p 
            className="text-center text-lg text-gray-600"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeIn}
          >
            Los conferencistas magistrales serán anunciados próximamente.
          </motion.p>
        </Section>
        
        <Section id="sede" title="Sede del Evento">
            <motion.div 
              className="text-center"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
            >
                 <motion.h3 variants={fadeInUpItem} className="text-2xl font-bold text-[#2A9D8F]">Santiago de Chile</motion.h3>
                 <motion.p variants={fadeInUpItem} className="mt-4 text-lg text-gray-700 max-w-3xl mx-auto">
                    La conferencia se llevará a cabo en Santiago de Chile, la capital y el centro económico del país. Ubicada en un valle rodeado por las cumbres nevadas de los Andes y la Cordillera de la Costa, Santiago ofrece una rica vida cultural, histórica y una moderna infraestructura, proporcionando un escenario ideal para el intercambio de conocimientos. Próximamente se anunciará la sede específica y las opciones de alojamiento.
                 </motion.p>
                 <motion.img 
                   variants={fadeInUpItem} 
                   src="https://assets-us-01.kc-usercontent.com/b2956330-c34f-0064-2c6f-27bd5c0147fc/3a824406-78ad-4378-a448-94cce9350c6a/skyline-santiago-andes-invierno.jpg" alt="Santiago de Chile" className="mt-8 rounded-xl shadow-lg mx-auto" />
            </motion.div>
        </Section>

        <Section id="ediciones" title={content.sections.pastEditions.title} className="bg-white py-16 md:py-24" contentClassName="!max-w-7xl">
            <motion.div
                className="flex overflow-x-auto space-x-6 p-4 pb-8 snap-x snap-mandatory"
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
            >
                {content.sections.pastEditions.editions.map((edition, index) => (
                    <motion.div 
                        key={index} 
                        variants={fadeInUpItem} 
                        className="flex-shrink-0 w-80 snap-center"
                    >
                        <BookCoverCard item={edition} />
                    </motion.div>
                ))}
            </motion.div>
        </Section>
        
        <Section id="comites" title="Comités" className="bg-gray-100 py-16 md:py-24">
          <motion.div 
            className="space-y-12 max-w-5xl mx-auto"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUpItem} className="space-y-6">
              <h3 className="text-2xl font-bold text-[#2A9D8F] text-center">{content.sections.committees.organizer.title}</h3>
              <div className="space-y-3">
                {content.sections.committees.organizer.roles.map((role, idx) => (
                  <p key={idx} className="text-lg text-gray-800 font-['Roboto'] text-center">
                    <span className="font-bold text-[#0D2C54] mr-2">{role.title}:</span>
                    {role.name} – {role.affiliation}
                  </p>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeInUpItem} className="space-y-6">
              <h3 className="text-2xl font-bold text-[#2A9D8F] text-center">{content.sections.committees.founder.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {content.sections.committees.founder.members.map((member, idx) => (
                  <p key={idx} className="text-lg text-gray-800 font-['Roboto']text-center">
                    {member.name} – {member.affiliation}
                  </p>
                ))}
              </div>
            </motion.div>

            {content.sections.committees.localOrganizer.members.length > 0 && (
              <motion.div variants={fadeInUpItem} className="space-y-6">
                <h3 className="text-2xl font-bold text-[#2A9D8F] text-center">{content.sections.committees.localOrganizer.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {content.sections.committees.localOrganizer.members.map((member, idx) => (
                    <p key={idx} className="text-lg text-gray-800 font-['Roboto'] text-center">
                      {member.name} – {member.affiliation}
                    </p>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </Section>
        
      </main>
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CMSDataProvider>
        <AppContent />
      </CMSDataProvider>
    </AuthProvider>
  );
};

export default App;

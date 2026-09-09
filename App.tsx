
import React from 'react';
import { motion, Variants } from 'framer-motion';
import { designSystem } from './data/content';
import { useLanguage } from './contexts/LanguageContext';
import { Navbar } from './components/Navbar';
import { Header } from './components/Header';
import { AnnouncementMarquee } from './components/AnnouncementMarquee';
import { Section } from './components/Section';
import { ImportantDatesCard } from './components/ImportantDatesCard';
import { BookCoverCard } from './components/BookCoverCard';
import { SpeakerCarousel } from './components/SpeakerCarousel';
import { ChevronRightIcon } from './components/icons';
import { Footer } from './components/Footer';
import { CMSLayout } from './src/cms/CMSLayout';
import { AuthorDashboard } from './src/cms/AuthorDashboard';
import { AuthProvider, useAuth } from './src/cms/AuthContext';
import { LoginScreen } from './src/cms/LoginScreen';
import { ChairDashboard } from './src/cms/ChairDashboard';
import { ReviewerDashboard } from './src/cms/ReviewerDashboard';
import { StaffDashboard } from './src/cms/StaffDashboard';
import { SubmissionForm } from './src/cms/SubmissionForm';
import { CMSDataProvider, useCMSData } from './src/cms/CMSDataContext';
import { RegistrationSection } from './src/registration/RegistrationSection';

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
  const { papers, createPaper, updatePaper } = useCMSData();
  const [activeCmsTab, setActiveCmsTab] = React.useState('submissions');
  const [editingPaperId, setEditingPaperId] = React.useState<string | null>(null);
  const editingPaper = React.useMemo(
    () => (editingPaperId ? papers.find((paper) => paper.id === editingPaperId) || null : null),
    [editingPaperId, papers]
  );

  React.useEffect(() => {
    if (!user) return;
    if (user.role === 'reviewer') {
      setActiveCmsTab('reviews');
    } else if (user.role === 'chair') {
      setActiveCmsTab('admin');
    } else if (user.role === 'staff') {
      setActiveCmsTab('staff');
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
        <AuthorDashboard
          onNewSubmission={() => {
            setEditingPaperId(null);
            setActiveCmsTab('new-submission');
          }}
          onEditSubmission={(paperId: string) => {
            setEditingPaperId(paperId);
            setActiveCmsTab('edit-submission');
          }}
        />
      )}
      {activeCmsTab === 'new-submission' && (
        <SubmissionForm
          onCancel={() => setActiveCmsTab('submissions')}
          onSubmit={async (payload) => {
            if (!user) return;
            const created = await createPaper(payload);
            if (!created) {
              alert('No se pudo enviar el trabajo. Intenta nuevamente.');
              return;
            }
            alert('¡Trabajo enviado con éxito!');
            setActiveCmsTab('submissions');
          }}
        />
      )}
      {activeCmsTab === 'edit-submission' && editingPaper && (
        <SubmissionForm
          mode="edit"
          initialPaper={editingPaper}
          onCancel={() => {
            setEditingPaperId(null);
            setActiveCmsTab('submissions');
          }}
          onSubmit={async (payload) => {
            if (!user || !editingPaper) return;
            const updated = await updatePaper(editingPaper.id, payload);
            if (!updated) {
              alert('No se pudo actualizar el trabajo. Verifica que aun no haya sido asignado a revisores.');
              return;
            }
            alert('Cambios guardados.');
            setEditingPaperId(null);
            setActiveCmsTab('submissions');
          }}
        />
      )}
      {activeCmsTab === 'edit-submission' && !editingPaper && (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-gray-500">
          Envío no encontrado.
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setActiveCmsTab('submissions')}
              className="text-[#2A9D8F] font-bold hover:underline"
            >
              Volver a mis envíos
            </button>
          </div>
        </div>
      )}
      {activeCmsTab === 'reviews' && <ReviewerDashboard />}
      {activeCmsTab === 'admin' && <ChairDashboard />}
      {activeCmsTab === 'staff' && <StaffDashboard />}
    </CMSLayout>
  );
};

const resolveViewFromPath = (path: string) => (path.startsWith('/cms') ? 'cms' : 'web');

const AppContent: React.FC = () => {
  const { content, ui, language } = useLanguage();
  const [view, setView] = React.useState<'web' | 'cms'>(() => resolveViewFromPath(window.location.pathname));
  const [downloadingTemplate, setDownloadingTemplate] = React.useState<string | null>(null);

  const handleTemplateDownload = async (gcsKey: string) => {
    setDownloadingTemplate(gcsKey);
    try {
      const response = await fetch(`/api/gcs-sign?object=${encodeURIComponent(gcsKey)}`);
      if (!response.ok) throw new Error('Failed to get download URL');
      const { url } = await response.json() as { url: string };
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      alert('No se pudo generar el enlace de descarga. Intente nuevamente.');
    } finally {
      setDownloadingTemplate(null);
    }
  };

  const navigateTo = React.useCallback((nextView: 'web' | 'cms') => {
    const nextPath = nextView === 'cms' ? '/cms' : '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setView(nextView);
  }, []);

  React.useEffect(() => {
    const handlePopState = () => {
      setView(resolveViewFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const CommitteeMember: React.FC<{ name: string; affiliation: string }> = ({ name, affiliation }) => (
    <div className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow h-full">
      <div className="mx-auto bg-gray-200 h-24 w-24 rounded-full mb-4 flex items-center justify-center">
         <span className="text-gray-500 text-sm">{ui.photoPlaceholder}</span>
      </div>
      <h4 className="font-bold text-[#0D2C54]">{name}</h4>
      <p className="text-sm text-gray-500">{affiliation || ' '}</p>
    </div>
  );

  if (view === 'cms') {
    return <CMSContainer onLogout={() => navigateTo('web')} />;
  }

  return (
    <div className="bg-white flex flex-col h-full" style={{ fontFamily: designSystem.typography.fontFamily.body }}>
      <Navbar navItems={content.navigation} onCmsClick={() => navigateTo('cms')} ui={ui} />
      <Header heroContent={content.sections.hero} learnMore={ui.learnMore} />
      <AnnouncementMarquee text={ui.deadlineBanner} />
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
            animate="show"
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
              <p>
                {ui.cmsAccessText}
                <a
                  href="https://www.clagtee2026.org/cms"
                  className="ml-1 font-semibold text-[#2A9D8F] hover:text-[#0D2C54] transition-colors"
                >
                  https://www.clagtee2026.org/cms
                </a>
                .
              </p>
            </motion.div>

            {content.sections.callForPapers.ieeeNotice && (
              <motion.div
                variants={fadeInUpItem}
                className="border-l-4 border-[#00629B] bg-[#EAF3FA] rounded-r-2xl p-6 shadow-sm"
              >
                <p className="text-sm uppercase tracking-wider font-bold text-[#00629B] mb-2">
                  IEEE
                </p>
                <p className="text-base leading-relaxed text-gray-800">
                  {content.sections.callForPapers.ieeeNotice}
                </p>
              </motion.div>
            )}

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
                      <th className="px-4 py-3 text-left font-semibold">{ui.templateHeader}</th>
                      <th className="px-4 py-3 text-left font-semibold">{ui.downloadLinkHeader}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.sections.callForPapers.styleInstructions.templates.map((template, index) => (
                      <tr key={template.label} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 border-t border-gray-200">{template.label}</td>
                        <td className="px-4 py-3 border-t border-gray-200">
                          <button
                            onClick={() => handleTemplateDownload(template.href)}
                            disabled={downloadingTemplate === template.href}
                            className="text-[#2A9D8F] font-bold hover:underline disabled:opacity-50"
                          >
                            {downloadingTemplate === template.href ? '...' : ui.downloadLabel}
                          </button>
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
          title={content.sections.registration.title}
          className="bg-[#0D2C54] py-16 md:py-24"
          titleClassName="text-white"
          contentClassName="!max-w-5xl"
        >
          <RegistrationSection />
        </Section>

        <Section id="conferencistas" title={content.sections.speakers.title} className="bg-gray-100 py-16 md:py-24" contentClassName="!max-w-7xl">
          <SpeakerCarousel
            speakers={content.sections.speakers.list}
            subtitle={content.sections.speakers.subtitle}
            moreSoonText={ui.speakersPlaceholder}
            viewFullText={language === 'es' ? 'Ver afiche oficial' : language === 'pt' ? 'Ver cartaz oficial' : 'View official banner'}
          />
        </Section>
        
        <Section id="sede" title={ui.venueTitle} contentClassName="!max-w-6xl">
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
            >
                <motion.div variants={fadeInUpItem} className="space-y-6">
                  <img
                    src="/venue-mrhotel.jpg"
                    alt={ui.venueHotelName}
                    className="rounded-2xl shadow-lg w-full object-cover max-h-[440px]"
                  />
                  <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100">
                    <iframe
                      title="Mapa MR. Hotel"
                      src="https://www.google.com/maps?q=MR.%20Hotel%2C%20Av.%20Pedro%20de%20Valdivia%20164%2C%20Providencia%2C%20Santiago%2C%20Chile&output=embed"
                      width="100%"
                      height="380"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  </div>
                </motion.div>
                <motion.div variants={fadeInUpItem} className="text-left space-y-4">
                  <p className="text-sm font-bold uppercase tracking-wide text-[#2A9D8F]">{ui.venueCity}</p>
                  <h3 className="text-2xl font-bold text-[#0D2C54]">{ui.venueHotelName}</h3>
                  <p className="flex items-start gap-2 text-base font-semibold text-gray-700">
                    <span aria-hidden="true">📍</span>
                    <span>{ui.venueAddress}</span>
                  </p>
                  <p className="text-base leading-relaxed text-gray-700 font-['Roboto']">{ui.venueDescription}</p>
                  <div className="bg-[#2A9D8F]/10 border border-[#2A9D8F]/30 rounded-xl p-4 text-[#0D2C54] font-semibold">
                    {ui.venueRatesNote}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                    <h4 className="text-lg font-bold text-[#0D2C54]">{ui.venueBookingTitle}</h4>
                    <p className="text-sm text-gray-700 font-['Roboto']">{ui.venueBookingIntro}</p>
                    <div className="text-sm text-gray-800 font-['Roboto'] space-y-1">
                      <p className="font-bold text-[#0D2C54]">{ui.venueBookingContactName}</p>
                      <p>{ui.venueBookingContactRole}</p>
                      <p>{ui.venueBookingPhone}</p>
                      <p>{ui.venueBookingMobile}</p>
                      <p>
                        <a href={`mailto:${ui.venueBookingEmail}`} className="text-[#2A9D8F] hover:underline">
                          {ui.venueBookingEmail}
                        </a>
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 font-['Roboto']">{ui.venueBookingWarning}</p>
                  </div>
                  <a
                    href="https://www.mrhoteles.cl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#0D2C54] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#1A4B8A] transition-all shadow-lg"
                  >
                    <span>mrhoteles.cl</span>
                    <ChevronRightIcon className="w-4 h-4" />
                  </a>
                </motion.div>
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
                        <BookCoverCard item={edition} editionPrefix={ui.editionPrefix} />
                    </motion.div>
                ))}
            </motion.div>
        </Section>
        
        <Section id="comites" title={ui.committeesTitle} className="bg-gray-100 py-16 md:py-24">
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
      <Footer ui={ui} />
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

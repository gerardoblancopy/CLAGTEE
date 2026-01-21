import { AppData } from '../types';

export const appData: AppData = {
  "designSystem": {
    "colors": {
      "primary": "#0D2C54",
      "secondary": "#2A9D8F",
      "accent": "#F4A261",
      "background": "#FFFFFF",
      "text": {
        "primary": "#333333",
        "secondary": "#FFFFFF",
        "link": "#2A9D8F"
      }
    },
    "typography": {
      "fontFamily": {
        "headings": "'Montserrat', sans-serif",
        "body": "'Roboto', sans-serif"
      },
      "fontSizes": {
        "h1": "2.5rem",
        "h2": "2rem",
        "h3": "1.75rem",
        "body": "1rem",
        "caption": "0.875rem"
      },
      "fontWeight": {
        "light": 300,
        "regular": 400,
        "bold": 700
      }
    },
    "components": {
      "button": {
        "base": {
          "padding": "12px 24px",
          "borderRadius": "8px",
          "border": "2px solid transparent",
          "fontWeight": 700,
          "cursor": "pointer",
          "textTransform": "uppercase"
        },
        "primary": {
          "backgroundColor": "#0D2C54",
          "color": "#FFFFFF"
        },
        "secondary": {
          "backgroundColor": "transparent",
          "color": "#0D2C54",
          "borderColor": "#0D2C54"
        }
      },
      "card": {
        "backgroundColor": "#FFFFFF",
        "borderRadius": "12px",
        "boxShadow": "0 4px 12px rgba(0,0,0,0.1)",
        "padding": "24px"
      },
      "navbar": {
        "backgroundColor": "rgba(255, 255, 255, 0.9)",
        "boxShadow": "0 2px 8px rgba(0,0,0,0.07)",
        "padding": "16px 32px"
      }
    }
  },
  "content": {
    "conferenceTitle": "Congreso Latinoamericano de Generación y Transporte de Energía Eléctrica 2026",
    "navigation": [
      { "text": "Inicio", "url": "#inicio" },
      { "text": "Acerca de", "url": "#acerca-de" },
      { "text": "Fechas", "url": "#fechas" },
      { "text": "Ejes Temáticos", "url": "#ejes" },
      { "text": "Envíos", "url": "#envio" },
      { "text": "Inscripción", "url": "#inscripcion" },
      { "text": "Conferencistas", "url": "#conferencistas" },
      { "text": "Sede", "url": "#sede" },
      { "text": "Ediciones", "url": "#ediciones" },
      { "text": "Comités", "url": "#comites" },
      { "text": "Contacto", "url": "#contacto" }
    ],
    "sections": {
      "hero": {
        "title": "XVI CLAGTEE 2026",
        "subtitle": "XVI Congreso Latinoamericano de Generación y Transporte de Energía Eléctrica",
        "location": "Santiago de Chile",
        "date": "19 al 23 de Octubre, 2026"
      },
      "presentation": {
        "title": "Acerca del CLAGTEE",
        "body": [
            "La creciente demanda de energía eléctrica en los países latinoamericanos exige una mejora sostenida en la calidad del servicio y en la eficiencia de las operaciones técnico-económicas. Esta realidad impone la necesidad de optimizar, de forma permanente, la planificación del crecimiento en todos los niveles de operación de los sistemas eléctricos. Dicha planificación debe integrar tanto los factores económicos y técnicos como los impactos medioambientales asociados a la instalación de nuevas centrales eléctricas, así como la incorporación de tecnologías emergentes, sistemas de control avanzados y medidas reforzadas de seguridad.",
            "En este contexto, ha ido consolidándose de manera paulatina un proceso de integración regional, motivado por la similitud de las necesidades energéticas entre los países latinoamericanos, incluidas sus infraestructuras de generación.",
            "A partir de estas premisas, la Pontificia Universidad Católica de Valparaíso (Chile), la Universidad Estatal Paulista (UNESP, Brasil) y la Universidad Nacional de Mar del Plata (Argentina) han unido esfuerzos para organizar un congreso bianual que fomente el intercambio de conocimientos en torno a metodologías de análisis, planificación operativa e incorporación tecnológica, orientadas al fortalecimiento de los sistemas de generación y transmisión de energía eléctrica. Este espacio de encuentro se ha institucionalizado a lo largo de más de tres décadas, celebrándose en distintas ciudades del continente.",
            "La primera edición del Congreso Latinoamericano de Generación, Transmisión y Distribución se realizó en 1993. Desde entonces, el congreso ha constituido un foro fundamental para el diálogo entre el ámbito académico y el sector industrial, promoviendo el intercambio de conocimientos y experiencias en torno a los desafíos y avances en la operación de sistemas eléctricos."
        ]
      },
      "chronology": {
        "title": "Síntesis cronológica",
        "events": [
            "I CLAGTEE: Octubre de 1993 - Viña del Mar, Chile",
            "II CLAGTEE: Noviembre de 1995 - Mar del Plata, Argentina",
            "III CLAGTEE: Noviembre de 1997 - Campos do Jordão, Estado de San Pablo, Brazil",
            "IV CLAGTEE: Noviembre de 2000 - Viña del Mar, Chile",
            "V CLAGTEE: Noviembre de 2003 - São Pedro, Estado de San Pablo, Brazil",
            "VI CLAGTEE: Noviembre de 2005 - Mar del Plata, Argentina",
            "VII CLAGTEE: Octubre de 2007 - Valparaíso, Chile",
            "VIII CLAGTEE: Octubre de 2009 - Ubatuba, Brazil",
            "IX CLAGTEE: Noviembre de 2011 - Mar del Plata, Argentina",
            "X CLAGTEE: Octubre de 2013 - Viña del Mar, Chile",
            "XI CLAGTEE: Noviembre de 2015 - São José dos Campos, Brazil",
            "XII CLAGTEE: Noviembre de 2017 - Mar del Plata, Argentina",
            "XIII CLAGTEE: Octubre de 2019 - Santiago, Chile",
            "XIV CLAGTEE: Noviembre de 2022 - Rio de Janeiro, Brazil",
            "XV CLAGTEE: Noviembre de 2024 - Mar del Plata, Argentina",
            "XVI CLAGTEE: Octubre de 2026 - Santiago de Chile"
        ]
      },
      "importantDates": {
        "title": "Fechas Importantes",
        "dates": [
          { "event": "Lanzamiento y apertura para envío de trabajos completos", "date": "1 de Febrero de 2026" },
          { "event": "Fecha límite para la presentación de trabajos completos", "date": "15 de Junio de 2026" },
          { "event": "Notificación de aceptación de trabajos completos", "date": "15 de Septiembre de 2026" },
          { "event": "Pre-Conferencia", "date": "19 y 20 de Octubre de 2026" },
          { "event": "Inicio de la Conferencia", "date": "21 de Octubre de 2026" },
          { "event": "Finalización de la Conferencia", "date": "23 de Octubre de 2026"}
        ]
      },
      "thematicAxes": {
        "title": "Ejes Temáticos",
        "tracks": [
          {
            "id": "Track 1",
            "title": "Planificación, Operación y Confiabilidad de Sistemas de Potencia",
            "scope": "Planificación robusta, operación segura y gestión del riesgo en sistemas eléctricos bajo incertidumbre y nuevas restricciones técnicas.",
            "topics": [
              "Planificación y expansión de sistemas de potencia",
              "Operación segura en tiempo real y despacho óptimo",
              "Gestión de activos, confiabilidad y resiliencia",
              "Prevención de apagones y manejo de eventos extremos",
              "Flexibilidad operativa y servicios complementarios",
              "Control, protección y automatización de sistemas",
              "Corredores de transmisión AC, HVDC y arquitecturas AC–DC híbridas",
              "Distribución inteligente y gestión avanzada de redes"
            ]
          },
          {
            "id": "Track 2",
            "title": "Integración de Energías Renovables, DER y Almacenamiento",
            "scope": "Transformación del sistema eléctrico debido a renovables variables, electromovilidad y recursos distribuidos.",
            "topics": [
              "Integración masiva de renovables y recursos energéticos distribuidos",
              "Estrategias y tecnologías de almacenamiento de energía",
              "Convertidores grid-forming y grid-following",
              "Calidad de energía en sistemas con alta penetración renovable",
              "Sistemas multi-energía y acoplamiento sectorial",
              "Estabilidad y control asociados a renovables y DER"
            ]
          },
          {
            "id": "Track 3",
            "title": "Electrónica de Potencia y Conversión de Energía",
            "scope": "Avances en convertidores y control de electrónica de potencia para transmisión, distribución, movilidad eléctrica y microrredes.",
            "topics": [
              "Convertidores avanzados para transmisión y distribución",
              "Control de convertidores en redes débiles",
              "Resonancias, estabilidad y mitigación de armónicos",
              "FACTS y sistemas HVDC de nueva generación",
              "Electrónica de potencia para renovables y movilidad eléctrica",
              "Calidad de energía y filtrado activo"
            ]
          },
          {
            "id": "Track 4",
            "title": "Sensores, Metrología y Monitoreo Avanzado",
            "scope": "Instrumentación inteligente y sistemas de medición de última generación para diagnóstico del sistema eléctrico.",
            "topics": [
              "PMU, µPMU y FDR: medición fasorial y de frecuencia",
              "Sensores distribuidos, ópticos y fotónicos",
              "Condition monitoring y mantenimiento predictivo",
              "Diagnósticos avanzados y procesamiento de señales",
              "Sensado para control, protección y automatización"
            ]
          },
          {
            "id": "Track 5",
            "title": "Telecomunicaciones, Redes Digitales y Ciberseguridad",
            "scope": "Infraestructura digital crítica para la operación, protección y automatización del sistema eléctrico.",
            "topics": [
              "IEC 61850 y arquitecturas de automatización de subestaciones",
              "WAMS/WAMPAC y comunicaciones para centros de control",
              "Ciberseguridad y resiliencia de sistemas ciber-físicos",
              "Redes y protocolos para DER y microrredes",
              "Automatización avanzada y telecomunicaciones de misión crítica"
            ]
          },
          {
            "id": "Track 6",
            "title": "Ciencia de Datos, IA y Computación Avanzada",
            "scope": "Uso de algoritmos avanzados, optimización y computación intensiva para mejorar el diseño y operación del sistema eléctrico.",
            "topics": [
              "IA y machine learning para operación y control",
              "Modelado estadístico, pronósticos y big data",
              "Computación distribuida y de alto desempeño",
              "Optimización y procesos estocásticos",
              "Gemelos digitales y redes autónomas"
            ]
          },
          {
            "id": "Track 7",
            "title": "Mercados Eléctricos, Economía, Regulación y Transición Energética",
            "scope": "Dimensión institucional, económica y estratégica de los sistemas eléctricos en transición hacia carbono-neutralidad.",
            "topics": [
              "Diseño y operación de mercados eléctricos",
              "Regulación, tarifas y mecanismos de remuneración",
              "Evaluación financiera y gestión de riesgos",
              "Planificación energética y políticas públicas",
              "Integración regional y resiliencia económica"
            ]
          },
          {
            "id": "Track 8",
            "title": "Máquinas Eléctricas, Drives y Accionamientos",
            "scope": "Desarrollo, modelación, control y operación de máquinas eléctricas y sistemas de accionamiento avanzados, fundamentales para generación, industria y movilidad eléctrica.",
            "topics": [
              "Máquinas síncronas, de inducción y de imanes permanentes",
              "Diseño, modelado multi-física y simulación avanzada",
              "Accionamientos eléctricos y técnicas de control de motores",
              "Drivers para movilidad eléctrica, tracción, industria y microrredes",
              "Fallas, diagnóstico, monitoreo y mantenimiento predictivo",
              "Interacción máquina–convertidor–red eléctrica",
              "Eficiencia, rendimiento térmico y optimización energética"
            ]
          }
        ]
      },
      "callForPapers": {
        "title": "LLAMADO A ENVÍO DE ARTÍCULOS",
        "intro": [
          "Incentivamos el envío de trabajos que aborden cualquiera de las temáticas incluidas en la lista \"Tópicos de Discusión\" de CLAGTEE 2026.",
          "Lea atentamente las siguientes pautas antes de enviar su trabajo:"
        ],
        "submissionDates": {
          "title": "Fechas de presentación",
          "window": "El Comité Revisor del CLAGTEE 2026 aceptará artículos para el proceso de revisión desde el 1 de febrero de 2026 hasta el 15 de junio de 20268 de agosto de 2026.",
          "process": "El proceso de envío se realizará a través del la Plataforma de Gestión de Papers y toda la comunicación con los autores se gestionará a través del correo electrónico oficial CLAGTEE 2026. No se aceptarán trabajos enviados por email ni por ningún otro medio electrónico.",
          "notification": "La notificación de aceptación/rechazo a los autores será el 15 de Septiembre de 2026, debiendo enviarse la versión final (en caso de haberse solicitado realizar cambios) de los trabajos aceptados hasta el 15 de octubre de 2026."
        },
        "guidelines": {
          "title": "Directrices para el envío",
          "body": [
            "Los artículos completos podrán estar escritos en idioma inglés, español o portugués.",
            "Los artículos no deberán exceder las 10 páginas (incluidas referencias y agradecimientos). Cualquier trabajo que exceda esa extensión será rechazado inmediatamente.",
            "Para confeccionar su trabajo, debe descargar una Plantilla para Actas de Conferencias IEEE, disponibles para Microsoft Word o LATEX. Los vínculos para descarga se encuentran más abajo, en esta misma página, en el párrafo titulado Instrucciones de estilo.",
            "Se sugiere la siguiente estructura para los artículos y se valorará positivamente que se utilicen las secciones indicadas:"
          ],
          "structure": [
            "Título",
            "Nombre del autor o autores",
            "Institución o empresa",
            "Dirección de contacto y correo electrónico",
            "Resumen (abstract)",
            "Al menos 5 palabras clave",
            "Introducción: especificando el problema estudiado y el estado del arte con una discusión bibliográfica.",
            "Materiales y Métodos: presentando los fundamentos que sustentan el estudio organizado de forma secuencial y bien estructurada",
            "Resultados y discusión: mostrando los resultados numéricos mediante gráficos o tablas y evaluando su significado.",
            "Conclusiones",
            "Referencias",
            "Breve reseña biográfica de los autores"
          ],
          "translationNote": "Si su trabajo está confeccionado en español o portugués, se deberán proporcionar los siguientes datos en inglés: Título, Resumen y Palabras clave, en campos específicos para tales efectos, en el \"Formulario de envío de artículos\"."
        },
        "reviewCriteria": {
          "title": "Criterios de revisión de trabajos",
          "body": "Los trabajos aceptados deberán contener resultados novedosos y significativos. Los resultados pueden ser teóricos o empíricos. Los resultados se juzgarán en función del grado en que se hayan establecido objetivamente o de su potencial de impacto científico y tecnológico. Los artículos serán evaluados en los siguientes aspectos:",
          "criteria": [
            "Relevancia para la Conferencia.",
            "Contribución al debate académico.",
            "Estructura del artículo.",
            "Claridad en la redacción.",
            "Metodología utilizada.",
            "Relevancia y claridad de figuras y tablas.",
            "Resumen claro y preciso.",
            "Uso y número de palabras clave.",
            "Claridad en los resultados, discusión y conclusiones.",
            "Relevancia de las referencias utilizadas."
          ]
        },
        "publicationConditions": {
          "title": "Condiciones de publicación para trabajos",
          "body": "Los trabajos aceptados serán publicados en el \"Book of Abstracts and Proceedings\" del CLAGTEE 2026 siempre y cuando se efectivice el pago de la tasa de publicación antes del 15 de octubre de 2026 como fecha límite."
        },
        "styleInstructions": {
          "title": "Instrucciones de estilo",
          "body": [
            "Los artículos deberán ser redactados respetando el formato de la Plantilla para Actas de Conferencias de la IEEE.",
            "En la siguiente tabla, descargue la plantilla de su preferencia, haciendo click sobre su vínculo de descarga."
          ],
          "templates": [
            {
              "label": "Plantilla IEEE A4 para Microsoft Word versiones recientes (.DOCX)",
              "href": "https://storage.cloud.google.com/clagtee2026/Templates/CLAGTEE2026_IEEE_WORD_conference_template_a4.docx?authuser=1"
            },
            {
              "label": "Plantilla IEEE A4 para LATEX (.ZIP)",
              "href": "https://storage.cloud.google.com/clagtee2026/Templates/CLAGTEE2026_IEEE-LATEX_conference_template_a4.zip?authuser=1"
            }
          ],
          "footnote": "El trabajo deberá estar formateado de acuerdo a la plantilla descargada, y deberá enviarse como un archivo .PDF y .DOCX. No se aceptarán artículos que estén redactados en otro formato ni tipo de archivo."
        }
      },
      "payments": {
        "title": "Inscripción y Pagos",
        "body": "La información sobre las tarifas de inscripción y los métodos de pago estará disponible próximamente."
      },
      "speakers": {
        "title": "Conferencistas",
        "list": []
      },
      "pastEditions": {
        "title": "Ediciones Anteriores",
        "editions": [
          {
            "year": "2024",
            "description": "XV CLAGTEE - Mar del Plata, Argentina",
            "imageUrl": "/bookcovers/clagtee2024_portada_book.png"
          },
          {
            "year": "2022",
            "description": "XIV CLAGTEE - Rio de Janeiro, Brazil",
            "imageUrl": "/bookcovers/clagtee2022_portada_book.png"
          },
          {
            "year": "2019",
            "description": "XIII CLAGTEE - Santiago, Chile",
            "imageUrl": "/bookcovers/clagtee2019_portada_book.png"
          },
          {
            "year": "2017",
            "description": "XII CLAGTEE - Mar del Plata, Argentina",
            "imageUrl": "/bookcovers/clagtee2017_portada_book.png"
          },
          {
            "year": "2015",
            "description": "XI CLAGTEE - São José dos Campos, Brazil",
            "imageUrl": "/bookcovers/clagtee2015_portada_book.png"
          },
          {
            "year": "2013",
            "description": "X CLAGTEE - Viña del Mar, Chile",
            "imageUrl": "/bookcovers/clagtee2013_portada_book.png"
          },
          {
            "year": "2011",
            "description": "IX CLAGTEE - Mar del Plata, Argentina",
            "imageUrl": "/bookcovers/clagtee2011_portada_book.jpg"
          },
          {
            "year": "2009",
            "description": "VIII CLAGTEE - Ubatuba, Brazil",
            "imageUrl": "/bookcovers/clagtee2009_portada_book.jpg"
          },
          {
            "year": "2007",
            "description": "VII CLAGTEE - Valparaíso, Chile",
            "imageUrl": "/bookcovers/clagtee2007_portada_book.jpg"
          },
          {
            "year": "2005",
            "description": "VI CLAGTEE - Mar del Plata, Argentina",
            "imageUrl": "/bookcovers/clagtee2005_portada_book.jpg"
          },
          {
            "year": "2003",
            "description": "V CLAGTEE - São Pedro, Brazil",
            "imageUrl": "/bookcovers/clagtee2003_portada_book.jpg"
          },
          {
            "year": "1997",
            "description": "III CLAGTEE - Campos do Jordão, Brazil",
            "imageUrl": "/bookcovers/clagtee1997_portada_book.jpg"
          },
          {
            "year": "1995",
            "description": "II CLAGTEE - Mar del Plata, Argentina",
            "imageUrl": "/bookcovers/clagtee1995_portada_book.jpg"
          },
          {
            "year": "1993",
            "description": "I CLAGTEE - Viña del Mar, Chile",
            "imageUrl": "/bookcovers/clagtee1993_portada_book.jpg"
          }
        ]
      },
      "committees": {
        "organizer": {
          "title": "Comité organizador",
          "roles": [
            { "title": "Chairman", "name": "Prof. Jorge Mendoza Baeza", "affiliation": "PUCV (Chile)" },
            { "title": "Co-chairman", "name": "Prof. Justo José Roberts", "affiliation": "UNMdP (Argentina)" },
            { "title": "Co-chairman", "name": "Prof. Celso Eduardo Tuna", "affiliation": "UNESP (Brazil)" }
          ]
        },
        "founder": {
          "title": "Comité fundador",
          "members": [
            { "name": "Prof. Juan Antonio Suárez", "affiliation": "UNMdP (Argentina)" },
            { "name": "Prof. Patricio Robles Calderon", "affiliation": "PUCV (Chile)" },
            { "name": "Prof. Claudio Oscar Dimenna", "affiliation": "UNMdP (Argentina)" },
            { "name": "Prof. Paulino Alonso Rivas", "affiliation": "PUCV (Chile)" },
            { "name": "Prof. José Luz Silveira", "affiliation": "UNESP (Brazil)" }
          ]
        },
        "localOrganizer": {
          "title": "Comité organizador local",
          "members": [
            { "name": "Prof. Gonzalo Farías", "affiliation": "PUCV (Chile)" },
            { "name": "Prof. Héctor Vargas", "affiliation": "PUCV (Chile)" },
            { "name": "Prof. Carlos Reusser", "affiliation": "PUCV (Chile)" },
            { "name": "Prof. Werner Jara", "affiliation": "PUCV (Chile)" },
            { "name": "Prof. Gabriel Hermosilla", "affiliation": "PUCV (Chile)" },
            { "name": "Prof. Pedro Escarate", "affiliation": "PUCV (Chile)" },
            { "name": "Prof. Miguel López", "affiliation": "PUCV (Chile)" },
            { "name": "Prof. Gerardo Blanco", "affiliation": "PUCV (Chile)" },
            { "name": "Prof. Martin Okoye", "affiliation": "PUCV (Chile)" },
            { "name": "Prof. Mauricio Rodriguez", "affiliation": "PUCV (Chile)" },
            { "name": "Prof. Ariel Leiva", "affiliation": "PUCV (Chile)" },
            { "name": "Prof. Diego Altamirano", "affiliation": "PUCV (Chile)" }
          ]
        }
      }
    }
  }
};

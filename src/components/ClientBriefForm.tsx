import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { db, storage } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Trash2, Plus, Upload, Loader2, Check, Layout, Type, Layers, Radio, Building2, Palette, Gem, Rocket, Leaf, Smile, Zap, Crown, ArrowRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";

const formSchema = z.object({
  productName: z.string().min(2, "El nombre del producto es obligatorio"),
  productDescription: z.string().min(10, "Describe tu producto con al menos 10 caracteres"),
  contactEmail: z.string().email("Email inválido"),
  colors: z.array(z.object({ value: z.string() })).min(1, "Elige al menos un color"),
  sections: z.array(z.object({ title: z.string() })).optional(),
  generalInfo: z.string().optional(),
  designStyle: z.string().min(1, "Elige un estilo de diseño"),
  designVibe: z.string().min(1, "Elige la vibra del diseño"),
});

type FormValues = z.infer<typeof formSchema>;

const BackgroundOrbs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-black">
    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/30 blur-[120px] animate-pulse" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/30 blur-[120px] animate-pulse delay-1000" />
    <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] rounded-full bg-pink-600/20 blur-[100px] animate-pulse delay-2000" />
  </div>
);

export default function ClientBriefForm() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0); // 1 for next, -1 for prev

  const { register, control, handleSubmit, setValue, watch, trigger, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      colors: [{ value: "#000000" }],
      sections: [{ title: "Hero / Portada" }, { title: "Características" }],
      productName: "",
      productDescription: "",
      contactEmail: "",
      generalInfo: "",
      designStyle: "",
      designVibe: "",
    }
  });

  const selectedStyle = watch("designStyle");
  const selectedVibe = watch("designVibe");

  const { fields: colorFields, append: appendColor, remove: removeColor } = useFieldArray({
    control,
    name: "colors"
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control,
    name: "sections"
  });

  const steps = [
    { id: "intro", title: "Comencemos", fields: [] },
    { id: "productName", title: "¿Qué vendes?", fields: ["productName"] },
    { id: "productDescription", title: "Cuéntanos más", fields: ["productDescription"] },
    { id: "contactEmail", title: "Contacto", fields: ["contactEmail"] },
    { id: "designStyle", title: "Estilo Visual", fields: ["designStyle"] },
    { id: "designVibe", title: "Vibra", fields: ["designVibe"] },
    { id: "colors", title: "Colores", fields: ["colors"] },
    { id: "files", title: "Archivos", fields: [] },
    { id: "sections", title: "Estructura", fields: ["sections", "generalInfo"] }, // Grouped for simplicity or split if needed
  ];

  const totalSteps = steps.length;

  const nextStep = async () => {
    const fieldsToValidate = steps[currentStep].fields;
    // @ts-ignore - trigger accepts array of strings but types can be strict
    const isValid = await trigger(fieldsToValidate as any);
    
    if (isValid) {
      setDirection(1);
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    }
  };

  const prevStep = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const onSubmit = async (data: FormValues) => {
    console.log("Intentando enviar formulario...", data);
    setIsSubmitting(true);
    try {
      const imageUrls: string[] = [];

      if (files) {
        console.log(`Subiendo ${files.length} archivos...`);
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const storageRef = ref(storage, `briefs/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const url = await getDownloadURL(snapshot.ref);
          imageUrls.push(url);
        }
      }

      console.log("Guardando en Firestore...", {
        ...data,
        colors: data.colors.map(c => c.value),
        sections: data.sections?.map(s => s.title) || [],
        exampleImageUrls: imageUrls,
      });

      await addDoc(collection(db, "briefs"), {
        ...data,
        colors: data.colors.map(c => c.value),
        sections: data.sections?.map(s => s.title) || [],
        exampleImageUrls: imageUrls,
        createdAt: serverTimestamp(),
      });

      setSubmittedData({ ...data, exampleImageUrls: imageUrls });
      setSubmitSuccess(true);
    } catch (error) {
      console.error("Error submitting form: ", error);
      alert("Hubo un error al enviar el formulario: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoAdvance = (field: keyof FormValues, value: string) => {
    setValue(field, value);
    // Add a small delay for visual feedback before advancing
    setTimeout(() => {
      nextStep();
    }, 300);
  };

  const variants: Variants = {
    enter: (direction: number) => ({
      y: direction > 0 ? 50 : -50,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      zIndex: 1,
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: (direction: number) => ({
      zIndex: 0,
      y: direction < 0 ? 50 : -50,
      opacity: 0,
      scale: 0.9,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    })
  };

  const designStyles = [
    { id: "minimal", label: "Minimalista", icon: Layout, desc: "Limpio, espacioso." },
    { id: "bold", label: "Bold", icon: Type, desc: "Alto contraste." },
    { id: "glassmorphism", label: "Glassy", icon: Layers, desc: "Transparencias." },
    { id: "retro", label: "Retro", icon: Radio, desc: "Nostálgico." },
    { id: "corporate", label: "Corporativo", icon: Building2, desc: "Serio." },
    { id: "playful", label: "Juguetón", icon: Palette, desc: "Colorido." },
  ];

  const designVibes = [
    { id: "luxury", label: "Lujo", icon: Gem },
    { id: "tech", label: "Tech", icon: Rocket },
    { id: "natural", label: "Natural", icon: Leaf },
    { id: "friendly", label: "Amigable", icon: Smile },
    { id: "energetic", label: "Energético", icon: Zap },
    { id: "elegant", label: "Elegante", icon: Crown },
  ];

  if (submitSuccess && submittedData) {
    const getStyleLabel = (id: string) => designStyles.find(s => s.id === id)?.label || id;
    const getVibeLabel = (id: string) => designVibes.find(v => v.id === id)?.label || id;

    return (
      <div className="relative flex items-center justify-center min-h-screen p-4 overflow-hidden text-white font-sans">
        <BackgroundOrbs />
        <Card className="w-full max-w-3xl bg-black/60 backdrop-blur-2xl border-white/20 shadow-2xl max-h-[90vh] flex flex-col">
          <CardHeader className="text-center border-b border-white/10 pb-6 shrink-0">
            <div className="mx-auto bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <CardTitle className="text-3xl text-white">¡Brief Recibido!</CardTitle>
            <CardDescription className="text-gray-300 text-lg mt-2">
              Aquí tienes el resumen de la información enviada.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-8 overflow-y-auto custom-scrollbar grow">
            <div className="space-y-8">
              {/* Info Principal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <h3 className="text-xs font-medium text-blue-400 uppercase tracking-wider">Producto / Servicio</h3>
                  <p className="text-xl font-semibold text-white">{submittedData.productName}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-medium text-blue-400 uppercase tracking-wider">Email de Contacto</h3>
                  <p className="text-xl font-semibold text-white">{submittedData.contactEmail}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-medium text-blue-400 uppercase tracking-wider">Descripción</h3>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{submittedData.productDescription}</p>
                </div>
              </div>

              {/* Estilo y Vibra */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Layout className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xs text-white/50 uppercase">Estilo</h3>
                    <p className="font-semibold text-lg">{getStyleLabel(submittedData.designStyle)}</p>
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Rocket className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xs text-white/50 uppercase">Vibra</h3>
                    <p className="font-semibold text-lg">{getVibeLabel(submittedData.designVibe)}</p>
                  </div>
                </div>
              </div>

              {/* Colores */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-blue-400 uppercase tracking-wider">Paleta de Colores</h3>
                <div className="flex flex-wrap gap-3">
                  {submittedData.colors.map((color: any, idx: number) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div 
                        className="w-16 h-16 rounded-2xl shadow-lg border-2 border-white/10"
                        style={{ backgroundColor: color.value }}
                      />
                      <span className="text-xs font-mono text-white/50">{color.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Secciones */}
              {submittedData.sections && submittedData.sections.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-blue-400 uppercase tracking-wider">Estructura Propuesta</h3>
                  <div className="flex flex-wrap gap-2">
                    {submittedData.sections.map((section: any, idx: number) => (
                      <span key={idx} className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-sm">
                        {section.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

               {/* Archivos */}
               {files && files.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-blue-400 uppercase tracking-wider">Archivos Adjuntos</h3>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
                    {Array.from(files).map((file, i) => (
                       <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                          <Check className="w-4 h-4 text-green-400" />
                          <span>{file.name}</span>
                       </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas Adicionales */}
              {submittedData.generalInfo && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-blue-400 uppercase tracking-wider">Notas Adicionales</h3>
                  <p className="text-gray-300 italic">"{submittedData.generalInfo}"</p>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="justify-center border-t border-white/10 pt-6 shrink-0 bg-black/20">
            <Button 
              onClick={() => window.location.reload()} 
              size="lg"
              className="bg-white text-black hover:bg-gray-200 rounded-full px-8 font-semibold"
            >
              Iniciar Nuevo Brief
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const onError = (errors: any) => {
    console.error("Errores de validación al enviar:", errors);
    alert("Hay errores en el formulario que impiden enviarlo. Revisa la consola para más detalles.");
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden font-sans text-white">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }
      `}</style>
      <BackgroundOrbs />
      
      {/* Progress Bar */}
      <div className="absolute top-8 left-0 right-0 px-8 md:px-32 z-20">
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/50">
          <span>Paso {currentStep + 1}</span>
          <span>de {totalSteps}</span>
        </div>
      </div>

      <div className="w-full max-w-2xl relative z-10 min-h-[400px] flex flex-col">
        <form onSubmit={handleSubmit(onSubmit, onError)} className="flex-1 flex flex-col">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex-1 flex flex-col"
            >
              <Card className="flex-1 border-0 bg-black/40 backdrop-blur-2xl border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] text-white overflow-hidden rounded-3xl">
                <CardHeader className="space-y-1 pb-2 border-b border-white/5">
                  <CardTitle className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                    {steps[currentStep].title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-8 min-h-[300px] flex flex-col justify-center">
                  
                  {/* Step 0: Intro */}
                  {currentStep === 0 && (
                    <div className="text-center space-y-6">
                      <p className="text-xl text-gray-300 leading-relaxed">
                        Ayúdanos a construir la landing page perfecta para tu negocio.
                        Responderemos unas breves preguntas para entender tu visión.
                      </p>
                      <Button 
                        type="button" 
                        onClick={nextStep}
                        size="lg"
                        className="text-lg px-8 py-6 rounded-full bg-white text-black hover:bg-gray-100 transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                      >
                        Comenzar <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    </div>
                  )}

                  {/* Step 1: Product Name */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <Label htmlFor="productName" className="text-lg text-gray-200">Nombre del Producto / Servicio</Label>
                      <Input 
                        id="productName" 
                        placeholder="Ej. Zapatillas Running Pro" 
                        {...register("productName")} 
                        autoFocus
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/20 text-xl h-14 focus-visible:ring-blue-500/50" 
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), nextStep())}
                      />
                      {errors.productName && <p className="text-red-400 animate-pulse">{errors.productName.message}</p>}
                    </div>
                  )}

                  {/* Step 2: Description */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <Label htmlFor="productDescription" className="text-lg text-gray-200">Descripción Detallada</Label>
                      <Textarea 
                        id="productDescription" 
                        placeholder="Describe las características principales, beneficios y público objetivo..." 
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/20 min-h-[150px] text-lg resize-none focus-visible:ring-blue-500/50"
                        {...register("productDescription")} 
                        autoFocus
                      />
                      {errors.productDescription && <p className="text-red-400 animate-pulse">{errors.productDescription.message}</p>}
                    </div>
                  )}

                  {/* Step 3: Email */}
                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <Label htmlFor="contactEmail" className="text-lg text-gray-200">Email de Contacto</Label>
                      <Input 
                        id="contactEmail" 
                        type="email" 
                        placeholder="tu@email.com" 
                        {...register("contactEmail")} 
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/20 text-xl h-14 focus-visible:ring-blue-500/50" 
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), nextStep())}
                      />
                      {errors.contactEmail && <p className="text-red-400 animate-pulse">{errors.contactEmail.message}</p>}
                    </div>
                  )}

                  {/* Step 4: Design Style */}
                  {currentStep === 4 && (
                    <div className="grid grid-cols-2 gap-4">
                      {designStyles.map((style) => (
                        <div 
                          key={style.id}
                          onClick={() => handleAutoAdvance("designStyle", style.id)}
                          className={`
                            cursor-pointer rounded-2xl border p-4 flex flex-col items-center justify-center text-center gap-3 transition-all duration-300
                            hover:scale-[1.03] active:scale-95
                            ${selectedStyle === style.id 
                              ? "border-blue-400 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]" 
                              : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30"}
                          `}
                        >
                          <style.icon className={`w-8 h-8 ${selectedStyle === style.id ? "text-blue-400" : "text-gray-400"}`} />
                          <span className="font-semibold text-sm md:text-base">{style.label}</span>
                          <span className="text-xs text-gray-400 hidden sm:block">{style.desc}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Step 5: Design Vibe */}
                  {currentStep === 5 && (
                    <div className="grid grid-cols-2 gap-4">
                       {designVibes.map((vibe) => (
                        <div 
                          key={vibe.id}
                          onClick={() => handleAutoAdvance("designVibe", vibe.id)}
                          className={`
                            cursor-pointer rounded-2xl border p-4 flex flex-col items-center justify-center gap-3 transition-all duration-300
                            hover:scale-[1.03] active:scale-95
                            ${selectedVibe === vibe.id 
                              ? "border-purple-400 bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.3)]" 
                              : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30"}
                          `}
                        >
                          <vibe.icon className={`w-8 h-8 ${selectedVibe === vibe.id ? "text-purple-400" : "text-gray-400"}`} />
                          <span className="font-medium text-sm md:text-base">{vibe.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Step 6: Colors */}
                  {currentStep === 6 && (
                    <div className="space-y-6">
                      <Label className="text-lg text-gray-200">Paleta de Colores</Label>
                      <div className="flex flex-wrap gap-4 justify-center">
                        {colorFields.map((field, index) => (
                          <div key={field.id} className="relative group w-20 h-20 rounded-full border-4 border-white/10 overflow-hidden shadow-lg transition-transform hover:scale-110">
                            <div 
                              className="absolute inset-0" 
                              style={{ backgroundColor: watch(`colors.${index}.value`) }}
                            />
                            <Input 
                              type="color" 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0 border-0" 
                              {...register(`colors.${index}.value`)} 
                            />
                            {colorFields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeColor(index)}
                                className="absolute top-0 right-0 z-10 bg-red-500 rounded-full p-1 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity m-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => appendColor({ value: "#000000" })}
                          className="w-20 h-20 rounded-full border-dashed border-2 border-white/30 bg-white/5 hover:bg-white/10 hover:border-white/50 text-white transition-all flex items-center justify-center"
                        >
                          <Plus className="w-8 h-8" />
                        </Button>
                      </div>
                      <p className="text-center text-sm text-white/50">Elige los colores que representen tu marca</p>
                    </div>
                  )}

                  {/* Step 7: Files */}
                  {currentStep === 7 && (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-white/20 bg-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/10 hover:border-white/40 transition-all duration-300 group">
                        <div className="p-4 bg-white/10 rounded-full mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
                           <Upload className="w-8 h-8 text-blue-400" />
                        </div>
                        <Input 
                          id="files" 
                          type="file" 
                          multiple 
                          accept="image/*,.pdf"
                          className="hidden" 
                          onChange={(e) => setFiles(e.target.files)}
                        />
                        <Label htmlFor="files" className="cursor-pointer text-xl font-medium text-white">
                          Sube tus archivos
                        </Label>
                        <p className="text-sm text-white/50 mt-2">Logos, imágenes, mockups (Opcional)</p>
                      </div>
                      
                      {files && (
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <p className="text-sm font-semibold mb-2 flex items-center gap-2 text-green-400">
                            <Check className="w-4 h-4" /> 
                            {files.length} archivos seleccionados
                          </p>
                          <ul className="text-xs text-white/60 space-y-1 pl-4 list-disc">
                            {Array.from(files).map((file, i) => (
                              <li key={i}>{file.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 8: Sections & Info */}
                  {currentStep === 8 && (
                    <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                      <div className="space-y-3">
                        <Label className="text-lg text-gray-200">Secciones deseadas</Label>
                        {sectionFields.map((field, index) => (
                          <div key={field.id} className="flex gap-2 group">
                            <Input 
                              placeholder={`Sección ${index + 1}`}
                              {...register(`sections.${index}.title`)} 
                              className="bg-white/5 border-white/10 text-white"
                            />
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeSection(index)}
                              className="opacity-50 hover:opacity-100 text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => appendSection({ title: "" })}
                          className="w-full border border-dashed border-white/20 hover:bg-white/5 text-white/60"
                        >
                          <Plus className="w-4 h-4 mr-2" /> Agregar Sección
                        </Button>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-white/10">
                        <Label htmlFor="generalInfo" className="text-lg text-gray-200">Notas Adicionales</Label>
                        <Textarea 
                          id="generalInfo" 
                          placeholder="Algo más que debamos saber..." 
                          {...register("generalInfo")} 
                          className="bg-white/5 border-white/10 text-white min-h-[100px]"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
                
                {/* Navigation Footer - Hide on Intro */}
                {currentStep > 0 && (
                  <CardFooter className="flex justify-between border-t border-white/5 pt-6 bg-black/20">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={prevStep}
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" /> Atrás
                    </Button>
                    
                    {currentStep < totalSteps - 1 ? (
                      <Button 
                        type="button" 
                        onClick={nextStep}
                        className="bg-white text-black hover:bg-gray-200 rounded-full px-6"
                      >
                        Siguiente <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    ) : (
                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full px-8 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Enviando...
                          </>
                        ) : (
                          "Finalizar Brief"
                        )}
                      </Button>
                    )}
                  </CardFooter>
                )}
              </Card>
            </motion.div>
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}

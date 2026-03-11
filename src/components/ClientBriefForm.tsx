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
import { Trash2, Plus, Upload, Loader2 } from "lucide-react";

const formSchema = z.object({
  productName: z.string().min(2, "El nombre del producto es obligatorio"),
  productDescription: z.string().min(10, "Describe tu producto con al menos 10 caracteres"),
  contactEmail: z.string().email("Email inválido"),
  colors: z.array(z.object({ value: z.string() })).min(1, "Elige al menos un color"),
  sections: z.array(z.object({ title: z.string() })).optional(),
  generalInfo: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ClientBriefForm() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      colors: [{ value: "#000000" }],
      sections: [{ title: "Hero / Portada" }, { title: "Características" }],
      productName: "",
      productDescription: "",
      contactEmail: "",
      generalInfo: ""
    }
  });

  const { fields: colorFields, append: appendColor, remove: removeColor } = useFieldArray({
    control,
    name: "colors"
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control,
    name: "sections"
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const imageUrls: string[] = [];

      // Upload files
      if (files) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const storageRef = ref(storage, `briefs/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const url = await getDownloadURL(snapshot.ref);
          imageUrls.push(url);
        }
      }

      // Save to Firestore
      await addDoc(collection(db, "briefs"), {
        ...data,
        colors: data.colors.map(c => c.value),
        sections: data.sections?.map(s => s.title) || [],
        exampleImageUrls: imageUrls,
        createdAt: serverTimestamp(),
      });

      setSubmitSuccess(true);
      // Reset form or redirect could happen here
    } catch (error) {
      console.error("Error submitting form: ", error);
      alert("Hubo un error al enviar el formulario. Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl text-green-600">¡Enviado con éxito!</CardTitle>
            <CardDescription>
              Hemos recibido tu información. El equipo de Telau revisará tu solicitud y comenzará a trabajar en tu landing page.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => window.location.reload()}>Enviar otro formulario</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Brief de Diseño</h1>
          <p className="text-gray-600 mt-2">Ayúdanos a construir la landing page perfecta para tu negocio.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Información Básica */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Producto</CardTitle>
              <CardDescription>Cuéntanos qué estás vendiendo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productName">Nombre del Producto / Servicio</Label>
                <Input id="productName" placeholder="Ej. Zapatillas Running Pro" {...register("productName")} />
                {errors.productName && <p className="text-red-500 text-sm">{errors.productName.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="productDescription">Descripción Detallada</Label>
                <Textarea 
                  id="productDescription" 
                  placeholder="Describe las características principales, beneficios y público objetivo..." 
                  className="min-h-[100px]"
                  {...register("productDescription")} 
                />
                {errors.productDescription && <p className="text-red-500 text-sm">{errors.productDescription.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email de Contacto</Label>
                <Input id="contactEmail" type="email" placeholder="tu@email.com" {...register("contactEmail")} />
                {errors.contactEmail && <p className="text-red-500 text-sm">{errors.contactEmail.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Identidad Visual */}
          <Card>
            <CardHeader>
              <CardTitle>Identidad Visual</CardTitle>
              <CardDescription>Elige los colores de tu marca y sube ejemplos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Colores de Marca</Label>
                <div className="flex flex-wrap gap-4">
                  {colorFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input 
                        type="color" 
                        className="w-12 h-12 p-1 cursor-pointer" 
                        {...register(`colors.${index}.value`)} 
                      />
                      <Button 
                        type="button" 
                        variant="secondary" 
                        size="icon" 
                        onClick={() => removeColor(index)}
                        disabled={colorFields.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => appendColor({ value: "#000000" })}
                    className="h-12"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Agregar Color
                  </Button>
                </div>
                {errors.colors && <p className="text-red-500 text-sm">{errors.colors.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="files">Ejemplos Visuales / Logos (Opcional)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <Input 
                    id="files" 
                    type="file" 
                    multiple 
                    accept="image/*,.pdf"
                    className="hidden" 
                    onChange={(e) => setFiles(e.target.files)}
                  />
                  <Label htmlFor="files" className="cursor-pointer">
                    <span className="text-primary font-semibold">Sube archivos</span> o arrastra y suelta
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">Imágenes, Logos, Mockups</p>
                  {files && (
                    <div className="mt-4 w-full text-left">
                      <p className="text-sm font-medium mb-1">Archivos seleccionados:</p>
                      <ul className="text-xs text-gray-500 list-disc pl-4">
                        {Array.from(files).map((file, i) => (
                          <li key={i}>{file.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estructura */}
          <Card>
            <CardHeader>
              <CardTitle>Estructura de la Landing</CardTitle>
              <CardDescription>Propón las secciones que te gustaría incluir (Opcional).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {sectionFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <Input 
                      placeholder={`Sección ${index + 1}`} 
                      {...register(`sections.${index}.title`)} 
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeSection(index)}
                    >
                      <Trash2 className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => appendSection({ title: "" })}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" /> Agregar Sección
                </Button>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="generalInfo">Información Adicional / Notas</Label>
                <Textarea 
                  id="generalInfo" 
                  placeholder="Cualquier otra cosa que debamos saber..." 
                  {...register("generalInfo")} 
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Brief"
            )}
          </Button>

        </form>
      </div>
    </div>
  );
}

package com.example.header.processor;

import com.example.header.Headers;
import com.example.header.ProcessHeaders;

import javax.annotation.processing.*;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.*;
import javax.lang.model.type.TypeMirror;
import javax.lang.model.util.Elements;
import javax.lang.model.util.Types;
import javax.tools.Diagnostic;
import java.util.Set;

/**
 * Annotation processor that verifies methods with @ProcessHeaders
 * have at least one parameter with a type annotated with @Headers
 */
@SupportedAnnotationTypes("com.example.header.ProcessHeaders")
@SupportedSourceVersion(SourceVersion.RELEASE_17)
public class HeaderAnnotationProcessor extends AbstractProcessor {

    private Types typeUtils;
    private Elements elementUtils;
    private Messager messager;

    @Override
    public synchronized void init(ProcessingEnvironment processingEnv) {
        super.init(processingEnv);
        typeUtils = processingEnv.getTypeUtils();
        elementUtils = processingEnv.getElementUtils();
        messager = processingEnv.getMessager();
    }

    @Override
    public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment roundEnv) {
        // Process all elements annotated with @ProcessHeaders
        for (Element element : roundEnv.getElementsAnnotatedWith(ProcessHeaders.class)) {
            if (element.getKind() == ElementKind.METHOD) {
                // For methods, check if they have a parameter with @Headers
                checkMethod((ExecutableElement) element);
            } else if (element.getKind() == ElementKind.CLASS) {
                // For classes, check all methods
                TypeElement typeElement = (TypeElement) element;
                for (Element enclosedElement : typeElement.getEnclosedElements()) {
                    if (enclosedElement.getKind() == ElementKind.METHOD) {
                        checkMethod((ExecutableElement) enclosedElement);
                    }
                }
            }
        }
        return true;
    }

    private void checkMethod(ExecutableElement method) {
        boolean hasHeaderParameter = false;
        
        // Check each parameter
        for (VariableElement parameter : method.getParameters()) {
            TypeMirror parameterType = parameter.asType();
            TypeElement typeElement = (TypeElement) typeUtils.asElement(parameterType);
            
            if (typeElement != null && typeElement.getAnnotation(Headers.class) != null) {
                hasHeaderParameter = true;
                break;
            }
        }
        
        // If the method doesn't have a header parameter, show an error
        if (!hasHeaderParameter) {
            String methodName = method.getSimpleName().toString();
            String className = ((TypeElement) method.getEnclosingElement()).getQualifiedName().toString();
            
            messager.printMessage(
                Diagnostic.Kind.ERROR,
                "Method " + methodName + " in " + className + " is annotated with @ProcessHeaders " +
                "but doesn't have any parameter with a type annotated with @Headers",
                method
            );
        }
    }
}
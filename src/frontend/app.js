const copy = {
  pt: {
    requirements: "Quem pode autorizar?",
    m365Requirement: "Privileged Role Administrator ou Global Administrator para consentir permissões de aplicação do Graph. Os privilégios do assistente são apresentados separadamente.",
    azureRequirement: "Owner, User Access Administrator ou RBAC Administrator com permissão para atribuir os dois papéis nas assinaturas selecionadas. Contributor não basta.",
    pim: "Ative sua função no PIM, se necessário. Pessoas diferentes podem autorizar cada ambiente.",
    secureEntry: "ACESSO AO PORTAL",
    emailLabel: "Seu e-mail",
    sendCode: "Receber código de acesso →",
    genericMessage: "Se este e-mail estiver autorizado, você receberá um código de acesso válido por cinco minutos.",
    codeLabel: "Código de seis dígitos",
    verifyCode: "Validar e continuar",
    resend: "Enviar outro código",
    connectionLabel: "NOVA CONEXÃO",
    logout: "Sair",
    setupTitle: "Qual ambiente vamos conectar?",
    setupHint: "Informe novamente os dados da aplicação multitenant do parceiro. Não restauramos conexões anteriores.",
    customerTenant: "Tenant ID do cliente",
    partnerTenant: "Tenant ID do parceiro",
    chooseServices: "Ambientes para conectar",
    createConnection: "Preparar conexão →",
    manageLabel: "GERENCIAR CONEXÃO",
    manageTitle: "Autorizações, passo a passo",
    adminWarning: "Uma única aplicação é usada no onboarding e na integração. O primeiro passo solicita apenas autenticação básica. Consentimentos Graph e acessos Azure são autorizados separadamente; acessos já existentes não são removidos.",
    identityTitle: "1. Identidade da aplicação no cliente",
    customerLogin: "Registrar / autenticar no Microsoft Entra",
    identityNotice: "Autentique no tenant do cliente. A Microsoft pode solicitar login, perfil básico e manutenção da sessão e criar a Enterprise App durante o consentimento. Este passo não solicita leitura/escrita de aplicações, acesso Graph de coleta ou permissões Azure. Se a identidade já for confirmada antes do login, verificamos os acessos existentes sem conceder novos. Uma verificação bloqueada não significa que a app não existe.",
    m365ConfigNote: "Revise e aceite ou recuse as permissões na tela oficial da Microsoft, no tenant do cliente. A lista vem da App Registration: revise e remova escopos antigos de administração de aplicações que não sejam necessários a outros consumidores. O portal não altera essa configuração nem revoga consentimentos anteriores.",
    consent: "Revisar consentimentos na Microsoft",
    azureRoles: "Somente Reader + Cost Management Reader, nas assinaturas que você selecionar.",
    azureLogin: "Entrar no Azure do cliente",
    discover: "Descobrir assinaturas",
    subscriptions: "Assinaturas disponíveis",
    saveSelection: "Salvar seleção",
    grant: "Conceder acessos selecionados",
    verificationTitle: "Permissão encontrada não é acesso testado",
    verificationNote: "Os indicadores distinguem configuração e teste. O Graph testa uma consulta compatível com as permissões encontradas. Um relatório autorizado não significa conteúdo baixado. O Azure testa leitura dos metadados da assinatura, não todos os serviços nem consultas de custo. Aguarde a propagação e repita o teste se necessário.",
    revokeTitle: "Desfazer acessos deste onboarding",
    revokeNote: "Remove somente atribuições Azure criadas nesta sessão. Sem histórico entre visitas. Não exclui a Enterprise App nem permissões anteriores ou herdadas. Consentimentos na tela Microsoft exigem revisão manual no Entra. Tokens já emitidos podem continuar válidos.",
    revokeAzure: "Revogar Azure",
    results: "Último resultado técnico",
    footer: "Você autoriza. Seu parceiro ajuda a transformar dados em decisões.",
    email_setup_pending: "O envio de códigos aguarda a configuração e verificação do domínio de e-mail.",
    login_required: "Entre no portal para continuar.",
    operator_not_authorized: "Este operador não está autorizado a acessar o portal.",
    session_expired: "Sua sessão expirou. Entre novamente.",
    invalid_or_expired_code: "Código inválido, expirado ou bloqueado por tentativas. Solicite um novo código.",
    rate_limited: "Limite de tentativas atingido. Aguarde e tente novamente.",
    requestFailed: "Não foi possível concluir. Consulte o código abaixo e tente novamente.",
    done: "Operação concluída. Confira o resultado abaixo.",
    chooseOne: "Selecione ao menos um ambiente.",
    microsoft_permission_denied: "A conta Microsoft não tem permissão para esta operação. Confira o tenant, as funções e a ativação no PIM.",
    identity_login_required: "Registre / autentique a identidade no Microsoft Entra do cliente antes de continuar.",
    arm_login_required: "Entre no Azure do cliente antes de continuar.",
    principal_and_selection_required: "Verifique a Enterprise App e selecione pelo menos uma assinatura.",
    principal_required: "Verifique a Enterprise App primeiro.",
    grantConfirm: "Confirmar concessão de Reader e Cost Management Reader nas assinaturas selecionadas?",
    revokeConfirm: "Confirmar remoção dos acessos rastreados por este onboarding? Isso pode interromper a coleta. A propagação não é instantânea.",
    configured: "Concessões configuradas; teste funcional pendente",
    pending: "Consentimento pendente",
    revoked: "Concessões rastreadas removidas",
    not_selected: "Não selecionado",
    emptySubscriptions: "Nenhuma assinatura elegível descoberta.",
    correlation: "Referência",
    selectionSaved: "Seleção salva.",
    secretLabel: "Client secret (valor)",
    secretHint: "Informe apenas se autorizado. A credencial fica temporariamente na memória do servidor; não é gravada em Blob, disco ou armazenamento do navegador.",
    callbackHint: "Cadastre este endereço como Redirect URI Web na aplicação do parceiro:",
    sessionCredential: "Credencial da aplicação nesta sessão",
    updateSecret: "Informar / substituir credencial",
    credentialReady: "Credencial disponível nesta sessão. O valor não será exibido novamente.",
    partner_credential_required: "Informe novamente o client secret para autenticar a aplicação nesta sessão. O callback deve estar cadastrado.",
    partner_authentication_failed: "A Microsoft não aceitou a autenticação da aplicação. Confira o App ID, o valor e a validade do secret e o callback Web.",
    partner_secret_invalid: "A Microsoft rejeitou o client secret. Confira se o valor pertence ao App ID informado e informe-o novamente.",
    partner_secret_expired: "O client secret expirou. O parceiro deve gerar uma nova credencial; informe o novo valor no portal.",
    partner_application_not_found: "A Microsoft não encontrou a aplicação no tenant utilizado. Confira o App ID, os tenants e a configuração multitenant.",
    microsoft_callback_mismatch: "O callback não corresponde ao cadastrado na aplicação. Confira o endereço exato exibido pelo portal.",
    microsoft_callback_platform_invalid: "A Microsoft identificou o callback como SPA. O backend deste portal precisa de um callback da plataforma Web.",
    microsoft_scope_invalid: "A Microsoft rejeitou os escopos solicitados. Confira as permissões delegadas da aplicação com o parceiro.",
    microsoft_login_retry_required: "O código de autenticação é inválido, expirou ou já foi usado. Inicie um novo login pelo botão Microsoft; não recarregue o callback.",
    microsoft_interaction_required: "A Microsoft exige uma nova autenticação ou consentimento. Inicie o login novamente e confira as políticas do tenant.",
    microsoft_connection_failed: "Não foi possível comunicar com a Microsoft. Tente um novo login e informe a referência se a falha persistir.",
    microsoft_authentication_failed: "A troca de autenticação com a Microsoft falhou. Confira o código técnico e a referência; depois inicie um novo login.",
    microsoft_nonce_mismatch: "A verificação de segurança do login Microsoft falhou. Inicie um novo login na mesma janela do portal e informe a referência se persistir.",
    invalid_oauth_state: "Esta tentativa de login expirou, já foi usada ou pertence a outra sessão. Inicie um novo login na mesma janela do portal.",
    internal_error: "O portal encontrou uma falha interna. Informe a referência para diagnóstico; o login não foi concluído.",
    credentialSaved: "Credencial recebida. Faça o login Microsoft novamente.",
    revocation_reauthentication_required: "Para revogar, autentique-se novamente no Microsoft correspondente. Depois confirme a revogação mais uma vez.",
    microsoft_authorization_declined: "A autorização Microsoft foi recusada ou bloqueada. Entre novamente para tentar outra vez.",
    consentTracking: "A tela Microsoft pode mostrar permissões delegadas e de aplicação. Revise ambas. O consentimento não é registrado como propriedade exclusiva do portal para exclusão automática.",
    entryTitle: "Access Onboarding",
    entryIntro: "Entre para configurar o acesso ao seu ambiente Microsoft.",
    exportTitle: "Dados para a integração",
    exportConnection: "Exportar conexão JSON",
    exportNote: "Exporte os identificadores e as assinaturas selecionadas para o sistema responsável pela coleta. O portal não os armazena entre sessões. O JSON não contém secret, tokens, login ou prova de acesso; salve-o antes de sair. A seleção pode incluir assinaturas ainda sem concessão validada.",
    exportDone: "Arquivo JSON exportado. Armazene-o no sistema da integração; permissões precisam ser verificadas ao usar a conexão.",
    checkConnection: "Verificar os três itens novamente",
    testGraph: "Testar Graph com a aplicação",
    testAzure: "Testar Azure com a aplicação",
    reviewAzure: "Revisar / adicionar assinaturas",
    effectivePermissions: "Permissões de aplicação Graph encontradas no cliente",
    noPermissions: "Nenhuma permissão de aplicação Graph encontrada na última verificação.",
    azureIdentityNote: "Descoberta e concessão usam o administrador do cliente. O teste usa App ID e secret, com um token exclusivo do Azure.",
    ephemeralNotice: "Sessão somente em memória por até 30 minutos. Ao sair, expirar ou reiniciar o servidor, os dados e o rastreamento são perdidos. Na próxima entrada, informe tudo novamente; a reversão posterior será manual no Azure/Entra.",
    loginPending: "Login Microsoft do cliente: pendente",
    loginDone: "Login Microsoft do cliente: concluído",
    appPending: "Enterprise App: ainda não verificada",
    appFound: "Enterprise App: OK",
    appMissing: "Enterprise App: não encontrada — registre / autentique no Microsoft Entra",
    appUnknown: "Enterprise App: não foi possível verificar os detalhes com os acessos existentes",
    permissionsUnavailable: "Não foi possível listar os consentimentos com os acessos existentes. Isso não significa que não existam permissões. Os testes de coleta são independentes; não pedimos privilégios extras para listar.",
    m365AccessFound: "Microsoft 365: acesso da aplicação validado",
    m365Pending: "Microsoft 365: ainda não verificado",
    m365Found: "Microsoft 365: consentimentos de aplicação encontrados",
    m365Missing: "Microsoft 365: nenhum consentimento de aplicação Graph encontrado",
    m365Failed: "Microsoft 365: falha ao verificar consentimentos",
    azurePending: "Azure: acesso da aplicação ainda não verificado",
    azureFound: "Azure: assinaturas visíveis à aplicação",
    azureMissing: "Azure: nenhuma assinatura elegível visível à aplicação",
    azureFailed: "Azure: verificação da aplicação falhou",
    consentPending: "Nova revisão de consentimento: ainda não iniciada",
    consentRequested: "Nova revisão de consentimento: em andamento",
    consentAccepted: "Consentimento aceito na Microsoft",
    consentDeclined: "Consentimento recusado ou bloqueado",
    consentFailed: "A Microsoft retornou uma falha no consentimento",
    microsoft_authorization_failed: "A Microsoft não concluiu a autorização. Isso não significa que você recusou. Confira o código Microsoft e a referência abaixo para identificar a causa; não compartilhe a URL do callback.",
    microsoft_resource_principal_missing: "Uma API/serviço solicitado pela aplicação não tem Service Principal no tenant do cliente. Revise as APIs configuradas na App Registration e a disponibilidade desse serviço no cliente. AADSTS650052 não indica secret inválido; não recrie a Enterprise App nem conceda permissões extras sem identificar o serviço.",
    missingResource: "App ID da API/serviço ausente (não é o App ID do parceiro)",
    graphNotTested: "Graph com a aplicação: ainda não testado",
    graphPassed: "Graph com a aplicação: consulta validada",
    graphReportPassed: "Graph com a aplicação: download de relatório autorizado (HTTP 302; conteúdo não baixado)",
    graphFailed: "Graph com a aplicação: teste falhou",
    graphUnsupported: "Graph: sem consulta de teste compatível com as permissões encontradas",
    azureAdminPending: "Administrador Azure: será solicitado ao revisar assinaturas, se necessário",
    azureAdminDone: "Administrador Azure: autenticado",
    discoveryPending: "Descoberta de assinaturas do administrador: pendente",
    discoveryDone: "Assinaturas elegíveis descobertas",
    selectionCount: "Assinaturas selecionadas e salvas",
    azureGrantConfigured: "Reader + Cost Management Reader configurados",
    azureGrantPending: "Verificação dos papéis: propagação pendente",
    azureGrantNotChecked: "Papéis desta assinatura: não verificados nesta sessão",
    azureTestPassed: "Aplicação: leitura da assinatura validada",
    azureTestFailed: "Aplicação: leitura da assinatura falhou",
    azureTestPending: "Aplicação: leitura da assinatura não testada",
    graph_probe_not_available: "Não há consulta de teste suportada pelas permissões de aplicação Graph encontradas. Revise as permissões; não adicionamos privilégios só para testar.",
    graph_application_test_failed: "O teste Graph com a aplicação falhou. Confira o diagnóstico e as permissões; consentimento aceito não garante acesso efetivo.",
    azure_application_test_failed: "Os papéis podem ter sido atribuídos, mas o teste com a aplicação falhou. Confira os resultados e aguarde a propagação antes de testar novamente.",
    application_permission_denied: "A aplicação não tem permissão para a consulta; verifique o consentimento/RBAC e a propagação.",
    application_query_failed: "A consulta com a aplicação falhou.",
    application_tenant_mismatch: "A resposta da aplicação não corresponde ao tenant ou à assinatura esperada.",
    principal_changed_with_grants: "A identidade mudou após concessões nesta sessão. Revise os acessos manualmente antes de continuar.",
    principal_context_mismatch: "A Enterprise App está desabilitada ou não corresponde ao App ID/tenant do parceiro informado.",
    invalid_microsoft_response: "A Microsoft retornou uma resposta inesperada. Tente novamente e informe a referência se persistir.",
  },
  es: {
    requirements: "¿Quién puede autorizar?",
    m365Requirement: "Privileged Role Administrator o Global Administrator para consentir permisos de aplicación de Graph. Los privilegios del asistente se presentan por separado.",
    azureRequirement: "Owner, User Access Administrator o RBAC Administrator con permiso para asignar ambos roles en las suscripciones seleccionadas. Contributor no es suficiente.",
    pim: "Active su rol en PIM si es necesario. Distintas personas pueden autorizar cada entorno.",
    secureEntry: "ACCESO AL PORTAL",
    emailLabel: "Su correo electrónico",
    sendCode: "Recibir código de acceso →",
    genericMessage: "Si este correo está autorizado, recibirá un código de acceso válido durante cinco minutos.",
    codeLabel: "Código de seis dígitos",
    verifyCode: "Validar y continuar",
    resend: "Enviar otro código",
    connectionLabel: "NUEVA CONEXIÓN",
    logout: "Salir",
    setupTitle: "¿Qué entorno vamos a conectar?",
    setupHint: "Introduzca nuevamente los datos de la aplicación multitenant del socio. No restauramos conexiones anteriores.",
    customerTenant: "Tenant ID del cliente",
    partnerTenant: "Tenant ID del socio",
    chooseServices: "Entornos que desea conectar",
    createConnection: "Preparar conexión →",
    manageLabel: "ADMINISTRAR CONEXIÓN",
    manageTitle: "Autorizaciones, paso a paso",
    adminWarning: "Una misma aplicación se usa para el onboarding y la integración. El primer paso solo solicita autenticación básica. Los consentimientos Graph y los accesos Azure se autorizan por separado; no se eliminan accesos existentes.",
    identityTitle: "1. Identidad de la aplicación en el cliente",
    customerLogin: "Registrar / autenticar en Microsoft Entra",
    identityNotice: "Autentíquese en el tenant del cliente. Microsoft puede solicitar inicio de sesión, perfil básico y mantenimiento de sesión y crear la Enterprise App durante el consentimiento. Este paso no solicita lectura/escritura de aplicaciones, acceso Graph de recopilación ni permisos Azure. Si la identidad ya se confirma antes del login, comprobamos los accesos existentes sin conceder nuevos. Una comprobación bloqueada no significa que la app no exista.",
    m365ConfigNote: "Revise y acepte o rechace los permisos en la pantalla oficial de Microsoft, en el tenant del cliente. La lista proviene de App Registration: revise y retire ámbitos antiguos de administración de aplicaciones que otros consumidores no necesiten. El portal no modifica esa configuración ni revoca consentimientos anteriores.",
    consent: "Revisar consentimientos en Microsoft",
    azureRoles: "Solo Reader + Cost Management Reader, en las suscripciones que seleccione.",
    azureLogin: "Entrar en Azure del cliente",
    discover: "Descubrir suscripciones",
    subscriptions: "Suscripciones disponibles",
    saveSelection: "Guardar selección",
    grant: "Conceder accesos seleccionados",
    verificationTitle: "Un permiso encontrado no es acceso probado",
    verificationNote: "Los indicadores distinguen configuración y prueba. Graph usa una consulta compatible con los permisos encontrados. Un informe autorizado no significa contenido descargado. Azure prueba lectura de metadatos de la suscripción, no todos los servicios ni consultas de costos. Espere la propagación y repita la prueba si es necesario.",
    revokeTitle: "Deshacer accesos de este onboarding",
    revokeNote: "Solo elimina asignaciones Azure creadas en esta sesión. Sin historial entre visitas. No elimina la Enterprise App ni permisos anteriores o heredados. El consentimiento en Microsoft requiere revisión manual en Entra. Los tokens emitidos pueden seguir siendo válidos.",
    revokeAzure: "Revocar Azure",
    results: "Último resultado técnico",
    footer: "Usted autoriza. Su socio ayuda a transformar los datos en decisiones.",
    email_setup_pending: "El envío de códigos espera la configuración y verificación del dominio de correo.",
    login_required: "Inicie sesión en el portal.",
    operator_not_authorized: "Este operador no está autorizado a acceder al portal.",
    session_expired: "Su sesión ha caducado. Inicie sesión de nuevo.",
    invalid_or_expired_code: "Código incorrecto, caducado o bloqueado por intentos. Solicite otro.",
    rate_limited: "Se alcanzó el límite de intentos. Espere antes de reintentar.",
    requestFailed: "No se pudo completar. Consulte el código y vuelva a intentarlo.",
    done: "Operación completada. Revise el resultado.",
    chooseOne: "Seleccione al menos un entorno.",
    microsoft_permission_denied: "La cuenta Microsoft no tiene permiso. Revise el tenant, los roles y PIM.",
    identity_login_required: "Registre / autentique la identidad en Microsoft Entra del cliente antes de continuar.",
    arm_login_required: "Entre en Azure del cliente antes de continuar.",
    principal_and_selection_required: "Verifique la Enterprise App y seleccione al menos una suscripción.",
    principal_required: "Verifique primero la Enterprise App.",
    grantConfirm: "¿Confirma Reader y Cost Management Reader en las suscripciones seleccionadas?",
    revokeConfirm: "¿Confirma eliminar los accesos registrados? Puede interrumpir la recopilación. La propagación no es inmediata.",
    configured: "Concesiones configuradas; prueba funcional pendiente",
    pending: "Consentimiento pendiente",
    revoked: "Concesiones registradas eliminadas",
    not_selected: "No seleccionado",
    emptySubscriptions: "No se han descubierto suscripciones elegibles.",
    correlation: "Referencia",
    selectionSaved: "Selección guardada.",
    secretLabel: "Client secret (valor)",
    secretHint: "Introduzca la credencial solo si está autorizado. Permanece temporalmente en la memoria del servidor, no en Blob, disco ni almacenamiento del navegador.",
    callbackHint: "Registre esta dirección como Redirect URI Web en la aplicación del socio:",
    sessionCredential: "Credencial de la aplicación en esta sesión",
    updateSecret: "Introducir / sustituir credencial",
    credentialReady: "Credencial disponible en esta sesión. El valor no se volverá a mostrar.",
    partner_credential_required: "Introduzca de nuevo el client secret para autenticar la aplicación en esta sesión. El callback debe estar registrado.",
    partner_authentication_failed: "Microsoft no aceptó la autenticación de la aplicación. Revise el App ID, el valor y la vigencia del secret y el callback Web.",
    partner_secret_invalid: "Microsoft rechazó el client secret. Compruebe que el valor corresponde al App ID e introdúzcalo de nuevo.",
    partner_secret_expired: "El client secret ha caducado. El socio debe generar una credencial nueva; introduzca su valor en el portal.",
    partner_application_not_found: "Microsoft no encontró la aplicación en el tenant utilizado. Revise el App ID, los tenants y la configuración multitenant.",
    microsoft_callback_mismatch: "El callback no coincide con el registrado. Revise la dirección exacta que muestra el portal.",
    microsoft_callback_platform_invalid: "Microsoft identifica el callback como SPA. El backend del portal necesita un callback de la plataforma Web.",
    microsoft_scope_invalid: "Microsoft rechazó los ámbitos solicitados. Revise los permisos delegados con el socio.",
    microsoft_login_retry_required: "El código de autenticación no es válido, ha caducado o ya se usó. Inicie un nuevo login con el botón Microsoft; no recargue el callback.",
    microsoft_interaction_required: "Microsoft exige una nueva autenticación o consentimiento. Inicie sesión de nuevo y revise las políticas del tenant.",
    microsoft_connection_failed: "No se pudo comunicar con Microsoft. Reintente el login e indique la referencia si persiste.",
    microsoft_authentication_failed: "Falló el intercambio de autenticación con Microsoft. Revise el código técnico y la referencia e inicie un nuevo login.",
    microsoft_nonce_mismatch: "Falló la verificación de seguridad del login Microsoft. Inicie un nuevo login en la misma ventana del portal e indique la referencia si persiste.",
    invalid_oauth_state: "El intento de login ha caducado, ya se usó o pertenece a otra sesión. Inicie un nuevo login en la misma ventana del portal.",
    internal_error: "El portal encontró un error interno. Indique la referencia para el diagnóstico; el login no se completó.",
    credentialSaved: "Credencial recibida. Inicie sesión en Microsoft de nuevo.",
    revocation_reauthentication_required: "Para revocar, autentíquese de nuevo en Microsoft y confirme otra vez la revocación.",
    microsoft_authorization_declined: "La autorización Microsoft fue rechazada o bloqueada. Inicie sesión de nuevo para reintentar.",
    consentTracking: "Microsoft puede mostrar permisos delegados y de aplicación. Revise ambos. No atribuimos los consentimientos exclusivamente al portal para eliminarlos automáticamente.",
    entryTitle: "Access Onboarding",
    entryIntro: "Inicie sesión para configurar el acceso a su entorno Microsoft.",
    exportTitle: "Datos para la integración",
    exportConnection: "Exportar conexión JSON",
    exportNote: "Exporte los identificadores y suscripciones seleccionadas al sistema de recopilación. El portal no los almacena entre sesiones. El JSON no contiene secreto, tokens, inicio de sesión ni prueba de acceso; guárdelo antes de salir. La selección puede incluir suscripciones sin concesión validada.",
    exportDone: "Archivo JSON exportado. Guárdelo en el sistema de integración; compruebe los permisos al usar la conexión.",
    checkConnection: "Comprobar los tres elementos nuevamente",
    testGraph: "Probar Graph con la aplicación",
    testAzure: "Probar Azure con la aplicación",
    reviewAzure: "Revisar / agregar suscripciones",
    effectivePermissions: "Permisos de aplicación Graph encontrados en el cliente",
    noPermissions: "No se encontraron permisos de aplicación Graph en la última comprobación.",
    azureIdentityNote: "El descubrimiento y la concesión usan al administrador del cliente. La prueba usa App ID y secreto, con un token exclusivo de Azure.",
    ephemeralNotice: "Sesión solo en memoria durante un máximo de 30 minutos. Al salir, expirar o reiniciar el servidor se pierden los datos y el seguimiento. En la próxima entrada, introduzca todo nuevamente; la reversión posterior será manual en Azure/Entra.",
    loginPending: "Inicio Microsoft del cliente: pendiente",
    loginDone: "Inicio Microsoft del cliente: completado",
    appPending: "Enterprise App: sin comprobar",
    appFound: "Enterprise App: OK",
    appMissing: "Enterprise App: no encontrada — registre / autentique en Microsoft Entra",
    appUnknown: "Enterprise App: no se pudieron verificar los detalles con los accesos existentes",
    permissionsUnavailable: "No se pudieron listar los consentimientos con los accesos existentes. No significa que no existan permisos. Las pruebas de recopilación son independientes; no solicitamos privilegios adicionales para listar.",
    m365AccessFound: "Microsoft 365: acceso de la aplicación verificado",
    m365Pending: "Microsoft 365: sin comprobar",
    m365Found: "Microsoft 365: consentimientos de aplicación encontrados",
    m365Missing: "Microsoft 365: sin consentimientos de aplicación Graph",
    m365Failed: "Microsoft 365: falló la comprobación de consentimientos",
    azurePending: "Azure: acceso de la aplicación sin comprobar",
    azureFound: "Azure: suscripciones visibles para la aplicación",
    azureMissing: "Azure: ninguna suscripción elegible visible",
    azureFailed: "Azure: falló la comprobación de la aplicación",
    consentPending: "Nueva revisión de consentimiento: no iniciada",
    consentRequested: "Nueva revisión de consentimiento: en curso",
    consentAccepted: "Consentimiento aceptado en Microsoft",
    consentDeclined: "Consentimiento rechazado o bloqueado",
    consentFailed: "Microsoft devolvió un error de consentimiento",
    microsoft_authorization_failed: "Microsoft no completó la autorización. No significa que usted la rechazó. Consulte el código Microsoft y la referencia para identificar la causa; no comparta la URL del callback.",
    microsoft_resource_principal_missing: "Una API/servicio solicitado por la aplicación no tiene Service Principal en el tenant del cliente. Revise las APIs de App Registration y la disponibilidad del servicio. AADSTS650052 no indica un secreto inválido; no vuelva a crear la Enterprise App ni conceda permisos adicionales sin identificar el servicio.",
    missingResource: "App ID de la API/servicio ausente (no es el App ID del socio)",
    graphNotTested: "Graph con la aplicación: sin probar",
    graphPassed: "Graph con la aplicación: consulta validada",
    graphReportPassed: "Graph: descarga de informe autorizada (HTTP 302; contenido no descargado)",
    graphFailed: "Graph con la aplicación: prueba fallida",
    graphUnsupported: "Graph: sin consulta de prueba compatible con los permisos encontrados",
    azureAdminPending: "Administrador Azure: se solicitará al revisar suscripciones si es necesario",
    azureAdminDone: "Administrador Azure: autenticado",
    discoveryPending: "Descubrimiento de suscripciones del administrador: pendiente",
    discoveryDone: "Suscripciones elegibles descubiertas",
    selectionCount: "Suscripciones seleccionadas y guardadas",
    azureGrantConfigured: "Reader + Cost Management Reader configurados",
    azureGrantPending: "Comprobación de roles: propagación pendiente",
    azureGrantNotChecked: "Roles de esta suscripción: sin comprobar en esta sesión",
    azureTestPassed: "Aplicación: lectura de la suscripción validada",
    azureTestFailed: "Aplicación: falló la lectura de la suscripción",
    azureTestPending: "Aplicación: lectura de la suscripción sin probar",
    graph_probe_not_available: "Los permisos de aplicación Graph encontrados no admiten una consulta de prueba compatible. Revise los permisos; no agregamos privilegios solo para probar.",
    graph_application_test_failed: "Falló la prueba Graph con la aplicación. Revise el diagnóstico y los permisos; aceptar el consentimiento no garantiza acceso efectivo.",
    azure_application_test_failed: "Los roles pueden haberse asignado, pero falló la prueba con la aplicación. Revise los resultados y espere la propagación antes de repetir.",
    application_permission_denied: "La aplicación no tiene permiso para la consulta; compruebe consentimiento/RBAC y propagación.",
    application_query_failed: "Falló la consulta con la aplicación.",
    application_tenant_mismatch: "La respuesta no corresponde al tenant o a la suscripción esperada.",
    principal_changed_with_grants: "La identidad cambió después de concesiones en esta sesión. Revise los accesos manualmente antes de continuar.",
    principal_context_mismatch: "La Enterprise App está deshabilitada o no coincide con el App ID/tenant del socio.",
    invalid_microsoft_response: "Microsoft devolvió una respuesta inesperada. Reintente e informe la referencia si persiste.",
  },
  en: {
    requirements: "Who can authorize?",
    m365Requirement: "Privileged Role Administrator or Global Administrator to consent to Graph application permissions. The assistant's privileges are presented separately.",
    azureRequirement: "Owner, User Access Administrator, or RBAC Administrator allowed to assign both roles in selected subscriptions. Contributor is not sufficient.",
    pim: "Activate your PIM role if needed. Different people can authorize each environment.",
    secureEntry: "PORTAL ACCESS",
    emailLabel: "Your email",
    sendCode: "Send access code →",
    genericMessage: "If this email is authorized, you will receive an access code valid for five minutes.",
    codeLabel: "Six-digit code",
    verifyCode: "Verify and continue",
    resend: "Send another code",
    connectionLabel: "NEW CONNECTION",
    logout: "Sign out",
    setupTitle: "Which environment shall we connect?",
    setupHint: "Enter the partner multitenant application details again. Previous connections are not restored.",
    customerTenant: "Customer Tenant ID",
    partnerTenant: "Partner Tenant ID",
    chooseServices: "Environments to connect",
    createConnection: "Prepare connection →",
    manageLabel: "MANAGE CONNECTION",
    manageTitle: "Authorization, step by step",
    adminWarning: "One application is used for onboarding and integration. The first step requests basic authentication only. Graph consent and Azure access are authorized separately; existing access is not removed.",
    identityTitle: "1. Application identity in the customer tenant",
    customerLogin: "Register / authenticate in Microsoft Entra",
    identityNotice: "Authenticate in the customer tenant. Microsoft may request sign-in, basic profile and session maintenance and create the Enterprise App during consent. This step requests no application read/write, Graph collection access or Azure permissions. If the identity is confirmed before sign-in, we check existing access without granting anything new. A blocked check does not mean the app is missing.",
    m365ConfigNote: "Review and accept or decline permissions on Microsoft's official screen in the customer tenant. The list comes from App Registration: review and remove old application-management scopes not needed by other consumers. The portal neither changes that configuration nor revokes earlier consent.",
    consent: "Review consent in Microsoft",
    azureRoles: "Only Reader + Cost Management Reader, on the subscriptions you select.",
    azureLogin: "Sign in to customer Azure",
    discover: "Discover subscriptions",
    subscriptions: "Available subscriptions",
    saveSelection: "Save selection",
    grant: "Grant selected access",
    verificationTitle: "Found permissions are not tested access",
    verificationNote: "Indicators distinguish configuration and tests. Graph uses a query supported by the permissions found. An authorized report is not downloaded content. Azure tests subscription metadata reads, not every service or cost queries. Allow propagation and retry if necessary.",
    revokeTitle: "Undo access from this onboarding",
    revokeNote: "Removes only Azure assignments created in this session. No history between visits. Does not delete the Enterprise App or previous/inherited permissions. Microsoft-hosted consent requires manual review in Entra. Issued tokens may remain valid.",
    revokeAzure: "Revoke Azure",
    results: "Latest technical result",
    footer: "You authorize. Your partner helps turn data into decisions.",
    email_setup_pending: "Code delivery is waiting for email-domain setup and verification.",
    login_required: "Sign in to the portal.",
    operator_not_authorized: "This operator is not authorized to access the portal.",
    session_expired: "Your session expired. Sign in again.",
    invalid_or_expired_code: "Invalid, expired, or locked code. Request a new one.",
    rate_limited: "Attempt limit reached. Wait before trying again.",
    requestFailed: "The operation could not be completed. Review the code below and try again.",
    done: "Operation completed. Review the result below.",
    chooseOne: "Select at least one environment.",
    microsoft_permission_denied: "The Microsoft account lacks permission. Check the tenant, roles, and PIM activation.",
    identity_login_required: "Register / authenticate the identity in customer Microsoft Entra before continuing.",
    arm_login_required: "Sign in to customer Azure before continuing.",
    principal_and_selection_required: "Verify the Enterprise App and select at least one subscription.",
    principal_required: "Verify the Enterprise App first.",
    grantConfirm: "Confirm Reader and Cost Management Reader on the selected subscriptions?",
    revokeConfirm: "Remove the access tracked by this onboarding? Collection may stop. Propagation is not immediate.",
    configured: "Grants configured; functional test pending",
    pending: "Consent pending",
    revoked: "Tracked grants removed",
    not_selected: "Not selected",
    emptySubscriptions: "No eligible subscriptions discovered.",
    correlation: "Reference",
    selectionSaved: "Selection saved.",
    secretLabel: "Client secret (value)",
    secretHint: "Only enter credentials if authorized. The credential stays temporarily in server memory, not Blob, disk or browser storage.",
    callbackHint: "Register this address as a Web Redirect URI on the partner application:",
    sessionCredential: "Application credential for this session",
    updateSecret: "Enter / replace credential",
    credentialReady: "Credential available for this session. Its value will not be displayed again.",
    partner_credential_required: "Re-enter the client secret to authenticate the application in this session. The callback must be registered.",
    partner_authentication_failed: "Microsoft rejected application authentication. Check the App ID, secret value and expiry, and Web callback.",
    partner_secret_invalid: "Microsoft rejected the client secret. Check that its value belongs to the entered App ID and enter it again.",
    partner_secret_expired: "The client secret has expired. The partner must generate a new credential; enter its value in the portal.",
    partner_application_not_found: "Microsoft could not find the application in the selected tenant. Check the App ID, tenants, and multitenant configuration.",
    microsoft_callback_mismatch: "The callback does not match the registered address. Check the exact address displayed by the portal.",
    microsoft_callback_platform_invalid: "Microsoft identifies the callback as SPA. This portal's backend requires a Web platform callback.",
    microsoft_scope_invalid: "Microsoft rejected the requested scopes. Review the delegated permissions with the partner.",
    microsoft_login_retry_required: "The authentication code is invalid, expired, or already used. Start a new login using the Microsoft button; do not reload the callback.",
    microsoft_interaction_required: "Microsoft requires new authentication or consent. Start sign-in again and review tenant policies.",
    microsoft_connection_failed: "Could not communicate with Microsoft. Start a new login and report the reference if the failure persists.",
    microsoft_authentication_failed: "The Microsoft authentication exchange failed. Check the technical code and reference, then start a new login.",
    microsoft_nonce_mismatch: "Microsoft sign-in security validation failed. Start a new login in the same portal window and report the reference if it persists.",
    invalid_oauth_state: "This login attempt expired, was already used, or belongs to another session. Start a new login in the same portal window.",
    internal_error: "The portal encountered an internal error. Report the reference for diagnosis; sign-in did not complete.",
    credentialSaved: "Credential received. Sign in to Microsoft again.",
    revocation_reauthentication_required: "To revoke, authenticate to Microsoft again, then confirm revocation once more.",
    microsoft_authorization_declined: "Microsoft authorization was declined or blocked. Sign in again to retry.",
    consentTracking: "Microsoft may display delegated and application permissions. Review both. Consent is not attributed exclusively to this portal for automatic deletion.",
    entryTitle: "Access Onboarding",
    entryIntro: "Sign in to configure access to your Microsoft environment.",
    exportTitle: "Integration data",
    exportConnection: "Export connection JSON",
    exportNote: "Export identifiers and selected subscriptions to the collection system. The portal does not store them between sessions. JSON contains no secret, tokens, login or access proof; save it before leaving. The selection can include subscriptions without verified grants.",
    exportDone: "JSON file exported. Store it in your integration system; verify permissions when using the connection.",
    checkConnection: "Check all three items again",
    testGraph: "Test Graph as the application",
    testAzure: "Test Azure as the application",
    reviewAzure: "Review / add subscriptions",
    effectivePermissions: "Graph application permissions found in the customer tenant",
    noPermissions: "No Graph application permissions found during the last check.",
    azureIdentityNote: "Discovery and grants use the customer administrator. Tests use App ID and secret with an Azure-specific token.",
    ephemeralNotice: "Memory-only session for up to 30 minutes. Logout, expiry or a server restart loses the data and tracking. Enter everything again next time; later rollback is manual in Azure/Entra.",
    loginPending: "Customer Microsoft sign-in: pending",
    loginDone: "Customer Microsoft sign-in: completed",
    appPending: "Enterprise App: not checked",
    appFound: "Enterprise App: OK",
    appMissing: "Enterprise App: not found — register / authenticate in Microsoft Entra",
    appUnknown: "Enterprise App: details could not be verified with existing access",
    permissionsUnavailable: "Consent grants could not be listed with existing access. This does not mean permissions are absent. Collection tests are independent; we do not request extra privileges to list grants.",
    m365AccessFound: "Microsoft 365: application access verified",
    m365Pending: "Microsoft 365: not checked",
    m365Found: "Microsoft 365: application consent grants found",
    m365Missing: "Microsoft 365: no Graph application consent found",
    m365Failed: "Microsoft 365: consent check failed",
    azurePending: "Azure: application access not checked",
    azureFound: "Azure: subscriptions visible to the application",
    azureMissing: "Azure: no eligible subscription visible to the application",
    azureFailed: "Azure: application check failed",
    consentPending: "New consent review: not started",
    consentRequested: "New consent review: in progress",
    consentAccepted: "Consent accepted in Microsoft",
    consentDeclined: "Consent declined or blocked",
    consentFailed: "Microsoft returned a consent error",
    microsoft_authorization_failed: "Microsoft did not complete authorization. This does not mean you declined. Check the Microsoft code and reference to identify the cause; do not share the callback URL.",
    microsoft_resource_principal_missing: "An API/service requested by the application has no service principal in the customer tenant. Review App Registration APIs and service availability. AADSTS650052 does not indicate an invalid secret; do not recreate the Enterprise App or grant additional permissions before identifying the service.",
    missingResource: "Missing API/service App ID (not the partner App ID)",
    graphNotTested: "Graph as the application: not tested",
    graphPassed: "Graph as the application: query verified",
    graphReportPassed: "Graph: report download authorized (HTTP 302; content not downloaded)",
    graphFailed: "Graph as the application: test failed",
    graphUnsupported: "Graph: no supported test query for the permissions found",
    azureAdminPending: "Azure administrator: requested when reviewing subscriptions, if needed",
    azureAdminDone: "Azure administrator: signed in",
    discoveryPending: "Administrator subscription discovery: pending",
    discoveryDone: "Eligible subscriptions discovered",
    selectionCount: "Subscriptions selected and saved",
    azureGrantConfigured: "Reader + Cost Management Reader configured",
    azureGrantPending: "Role verification: pending propagation",
    azureGrantNotChecked: "Subscription roles: not checked in this session",
    azureTestPassed: "Application: subscription read verified",
    azureTestFailed: "Application: subscription read failed",
    azureTestPending: "Application: subscription read not tested",
    graph_probe_not_available: "No supported test query matches the Graph application permissions found. Review permissions; we do not add privileges just to test.",
    graph_application_test_failed: "The application Graph test failed. Check the diagnosis and permissions; accepted consent does not prove effective access.",
    azure_application_test_failed: "Roles may have been assigned, but the application test failed. Check results and allow propagation before retrying.",
    application_permission_denied: "The application cannot perform this query; check consent/RBAC and propagation.",
    application_query_failed: "The application query failed.",
    application_tenant_mismatch: "The response does not match the expected tenant or subscription.",
    principal_changed_with_grants: "The identity changed after grants in this session. Review access manually before continuing.",
    principal_context_mismatch: "The Enterprise App is disabled or does not match the supplied partner App ID/tenant.",
    invalid_microsoft_response: "Microsoft returned an unexpected response. Retry and report the reference if it persists.",
  }
};
let lang = "pt", partner = "Your Partner", csrf = "", challengeId = "", address = "", active = null, busy = false;
const $ = id => document.getElementById(id);
const t = key => (copy[lang][key] ?? copy[lang].requestFailed).replaceAll("{partner}", partner);
function translate() {
  document.documentElement.lang = {pt:"pt-BR",es:"es",en:"en"}[lang];
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-lang]").forEach(el => el.setAttribute("aria-pressed", String(el.dataset.lang === lang)));
  $("partner-footer").textContent = partner;
  if (active) render(active);
}
function message(text, error = false) {
  $("message").textContent = text; $("message").classList.toggle("error", error); $("message").hidden = false;
}
function failureMessage(code, reference, microsoftCode, resourceAppId) {
  return `${t(code)} [${code}]${microsoftCode ? ` · ${microsoftCode}` : ""}${resourceAppId ? ` · ${t("missingResource")}: ${resourceAppId}` : ""}${reference ? ` · ${t("correlation")}: ${reference}` : ""}`;
}
async function request(path, body, method = "POST") {
  const response = await fetch(path, {
    method, headers: {"Content-Type":"application/json", "X-CSRF-Token":csrf},
    body: body === undefined ? undefined : JSON.stringify(body), credentials:"same-origin",
  });
  const data = response.status === 204 ? {} : await response.json();
  if (!response.ok) {
    const error = new Error(failureMessage(data.error ?? String(response.status), data.correlationId, data.microsoftErrorCode, data.resourceAppId));
    error.status = response.status; error.code = data.error; throw error;
  }
  return data;
}
async function action(button, run) {
  busy = true; button.disabled = true; updateControls(); $("message").hidden = true;
  try { await run(); } catch (error) {
    let text = error instanceof Error ? error.message : t("requestFailed");
    if (active?.onboarding) {
      // A failed operation may have partially completed; refresh evidence without hiding the original failure.
      try { await refresh(); } catch (refreshError) {
        if (refreshError.status === 401) {
          active = null; csrf = "";
          $("manage-panel").hidden = true; $("setup-panel").hidden = true; $("login-panel").hidden = false;
          $("authorization-info").hidden = true; document.body.classList.remove("authenticated");
          $("callback-url").textContent = "";
        } else text += ` ${refreshError.message}`;
      }
    }
    message(text, true);
  }
  finally { busy = false; button.disabled = false; updateControls(); }
}
function progress(id, key, state = "pending", detail = "") {
  const el = $(id);
  el.dataset.state = state;
  el.textContent = `${state === "passed" ? "✓" : state === "failed" ? "!" : "○"} ${t(key)}${detail ? ` · ${detail}` : ""}`;
}
function updateControls() {
  const data = active, o = data?.onboarding;
  if (!o) return;
  const ready = data.hasCredential, identity = ready && data.authentication?.identity;
  const principal = o.principalState === "exists";
  for (const button of document.querySelectorAll("[data-auth],[data-action]")) {
    let enabled = Boolean(ready);
    const path = button.dataset.action;
    if (button.dataset.auth === "arm") enabled &&= Boolean(identity);
    if (path === "/api/onboarding/check") enabled &&= Boolean(identity);
    if (path === "/api/m365/consent" || path === "/api/m365/test") enabled &&= Boolean(identity) && o.branches.includes("m365");
    if (path === "/api/azure/discover") enabled &&= Boolean(identity) && o.branches.includes("azure");
    if (path === "/api/azure/grant") enabled &&= Boolean(identity) && principal && o.selected.length > 0;
    if (path === "/api/azure/test") enabled &&= principal && o.selected.length > 0;
    if (path === "/api/azure/revoke") enabled &&= o.grants.some(grant => grant.status !== "revoked");
    button.disabled = busy || !enabled;
  }
  $("selection-form").querySelector("button").disabled = busy || !ready || !o.subscriptions.length;
  $("credential-form").querySelector("button").disabled = busy;
  $("export-connection").disabled = busy || !principal;
}
function render(data) {
  const newSession = active?.csrf !== data.csrf;
  active = data; csrf = data.csrf;
  document.body.classList.add("authenticated"); $("authorization-info").hidden = false;
  $("login-panel").hidden = true;
  const o = data.onboarding;
  $("setup-panel").hidden = Boolean(o); $("manage-panel").hidden = !o;
  if (!o) {
    if (newSession) { $("setup-form").reset(); $("session-secret").value = ""; $("result").textContent = ""; }
    return;
  }
  $("credential-status").textContent = t(data.hasCredential ? "credentialReady" : "partner_credential_required");
  $("credential-panel").open = !data.hasCredential;
  $("connection-details").replaceChildren();
  for (const [key, value] of [["Application (client) ID",o.appId],[t("customerTenant"),o.customerTenantId],[t("partnerTenant"),o.partnerTenantId]]) {
    const dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = key; dd.textContent = value; $("connection-details").append(dt, dd);
  }
  const authenticated = Boolean(data.authentication?.identity), principal = o.principalState === "exists";
  progress("login-status", authenticated ? "loginDone" : "loginPending", authenticated ? "passed" : "pending",
    authenticated ? data.authentication.logins.identity?.username : "");
  const appKey = principal ? "appFound" : o.principalState === "missing" ? "appMissing" : o.principalCheck?.status === "failed" ? "appUnknown" : "appPending";
  const appState = principal ? "passed" : o.principalState === "missing" ? "failed" : "pending";
  progress("principal-state", appKey, appState); progress("overview-app", appKey, appState);
  $("principal-status").textContent = principal ? `${o.principalName} · ${o.principalId}` : "";
  $("m365-actions").hidden = !o.branches.includes("m365"); $("azure-actions").hidden = !o.branches.includes("azure");
  const permissionCount = o.graphPermissions?.length ?? 0, m365Checked = Boolean(o.m365CheckedAt);
  const graphPassed = o.graphCheck?.status === "passed";
  const consentCheckFailed = !m365Checked && o.graphCheck?.status === "failed";
  progress("overview-m365", !o.branches.includes("m365") ? "not_selected" : graphPassed ? "m365AccessFound" : consentCheckFailed ? "m365Failed" : !m365Checked ? "m365Pending" : permissionCount ? "m365Found" : "m365Missing",
    graphPassed ? "passed" : consentCheckFailed ? "failed" : m365Checked ? permissionCount ? "passed" : "failed" : "pending", permissionCount ? String(permissionCount) : "");
  const consent = o.consent?.status, consentError = o.consent?.error;
  progress("consent-status", consent === "accepted" ? "consentAccepted" : consent === "declined" ? "consentDeclined" : consent === "failed" ? "consentFailed" : consent === "pending" ? "consentRequested" : "consentPending",
    consent === "accepted" ? "passed" : consent === "declined" || consent === "failed" ? "failed" : "pending",
    consentError ? failureMessage(consentError.code, consentError.reference, consentError.microsoftErrorCode, consentError.resourceAppId) : "");
  const graphCheck = o.graphCheck ?? {status:"not_tested"};
  progress("graph-test-status", graphCheck.status === "passed" ? graphCheck.evidence === "report_authorized" ? "graphReportPassed" : "graphPassed" :
    graphCheck.status === "failed" ? "graphFailed" : graphCheck.status === "unsupported" ? "graphUnsupported" : "graphNotTested",
    graphCheck.status === "passed" ? "passed" : graphCheck.status === "failed" ? "failed" : "pending",
    graphCheck.error ? `${t(graphCheck.error)}${graphCheck.microsoftErrorCode ? ` · ${graphCheck.microsoftErrorCode}` : ""}` : "");
  $("graph-permissions").replaceChildren();
  for (const permission of o.graphPermissions ?? []) {
    const li = document.createElement("li"); li.textContent = `${permission.value} · ${permission.displayName}`; $("graph-permissions").append(li);
  }
  if (!permissionCount) {
    const li = document.createElement("li"); li.textContent = t(m365Checked ? "noPermissions" : o.graphPermissionCheck?.status === "failed" ? "permissionsUnavailable" : "m365Pending"); $("graph-permissions").append(li);
  }
  const existingCount = o.azureExisting?.length ?? 0, azureCheck = o.azureDiscoveryCheck;
  progress("overview-azure", !o.branches.includes("azure") ? "not_selected" : azureCheck?.status === "failed" ? "azureFailed" :
    !azureCheck ? "azurePending" : existingCount ? "azureFound" : "azureMissing",
    azureCheck?.status === "passed" && existingCount ? "passed" : azureCheck ? "failed" : "pending",
    existingCount ? String(existingCount) : azureCheck?.error ? t(azureCheck.error) : "");
  progress("azure-login-status", data.authentication?.arm ? "azureAdminDone" : "azureAdminPending", data.authentication?.arm ? "passed" : "pending");
  progress("azure-discovery-status", o.subscriptionsCheckedAt ? "discoveryDone" : "discoveryPending",
    o.subscriptionsCheckedAt ? "passed" : "pending", o.subscriptionsCheckedAt ? String(o.subscriptions.length) : "");
  progress("azure-selection-status", "selectionCount", o.selected.length ? "passed" : "pending", String(o.selected.length));
  $("subscriptions").querySelectorAll("label,p").forEach(el => el.remove());
  if (!o.subscriptions.length) {
    const p = document.createElement("p"); p.textContent = t("emptySubscriptions"); $("subscriptions").append(p);
  }
  for (const sub of o.subscriptions) {
    const label = document.createElement("label"), check = document.createElement("input");
    check.type = "checkbox"; check.name = "subscription"; check.value = sub.subscriptionId; check.checked = o.selected.includes(sub.subscriptionId);
    const text = document.createElement("span"); text.className = "subscription-text";
    const name = document.createElement("strong"), id = document.createElement("code");
    name.textContent = sub.displayName; id.textContent = sub.subscriptionId; text.append(name, id);
    label.append(check,text); $("subscriptions").append(label);
  }
  $("selection-form").hidden = !o.subscriptions.length;
  $("azure-results").replaceChildren();
  const visible = new Map((o.azureExisting ?? []).map(sub => [sub.subscriptionId, sub]));
  for (const sub of o.subscriptions) if (o.selected.includes(sub.subscriptionId)) visible.set(sub.subscriptionId, sub);
  for (const sub of visible.values()) {
    const item = document.createElement("article"); item.className = "subscription-result";
    const name = document.createElement("strong"), id = document.createElement("code"), grant = document.createElement("p"), check = document.createElement("p");
    name.textContent = sub.displayName; id.textContent = sub.subscriptionId;
    const grantStatus = o.azureGrants?.find(value => value.subscriptionId === sub.subscriptionId)?.status;
    grant.textContent = t(grantStatus === "configured" ? "azureGrantConfigured" : grantStatus === "pending_propagation" ? "azureGrantPending" : "azureGrantNotChecked");
    grant.dataset.state = grantStatus === "configured" ? "passed" : "pending";
    const test = o.azureChecks?.[sub.subscriptionId];
    check.textContent = t(test?.status === "passed" ? "azureTestPassed" : test?.status === "failed" ? "azureTestFailed" : "azureTestPending") +
      (test?.error ? ` · ${t(test.error)}${test.microsoftErrorCode ? ` · ${test.microsoftErrorCode}` : ""}` : "");
    check.dataset.state = test?.status === "passed" ? "passed" : test?.status === "failed" ? "failed" : "pending";
    item.append(name, id, grant, check); $("azure-results").append(item);
  }
  updateControls();
}
async function refresh() {
  const data = await request("/api/session", undefined, "GET");
  const context = await request("/api/context", undefined, "GET");
  $("callback-url").textContent = context.callbackUrl;
  render(data);
  if (data.lastError) {
    const details = data.onboarding?.consent?.error;
    message(details?.code === data.lastError ? failureMessage(details.code, details.reference, details.microsoftErrorCode, details.resourceAppId) : t(data.lastError), true);
  }
}
document.querySelectorAll("[data-lang]").forEach(button => button.addEventListener("click", () => {
  lang = button.dataset.lang; translate(); $("message").hidden = true;
}));
$("email-form").addEventListener("submit", event => {
  event.preventDefault(); action(event.submitter, async () => {
    address = $("email").value.trim();
    const data = await request("/api/access/request", {email:address});
    challengeId = data.challengeId; $("code-form").hidden = false; $("code").value = ""; $("code").focus();
    message(t("genericMessage"));
  });
});
$("resend").addEventListener("click", () => $("email-form").requestSubmit());
$("code-form").addEventListener("submit", event => {
  event.preventDefault(); action(event.submitter, async () => {
    await request("/api/access/verify", {email:address, challengeId, code:$("code").value});
    await refresh();
    $("code").value = ""; $("message").hidden = true;
  });
});
$("setup-form").addEventListener("submit", event => {
  event.preventDefault(); action(event.submitter, async () => {
    const form = new FormData(event.target), branches = form.getAll("branch");
    if (!branches.length) throw new Error(t("chooseOne"));
    try {
      await request("/api/onboarding", {appId:form.get("appId"),clientSecret:form.get("clientSecret"),customerTenantId:form.get("customerTenantId"),partnerTenantId:form.get("partnerTenantId"),branches});
    } finally { $("client-secret").value = ""; }
    await refresh();
  });
});
$("credential-form").addEventListener("submit", event => {
  event.preventDefault(); action(event.submitter, async () => {
    try {
      await request("/api/onboarding/credential", {clientSecret:$("session-secret").value});
    } finally { $("session-secret").value = ""; }
    await refresh(); message(t("credentialSaved"));
  });
});
document.querySelectorAll(".logout").forEach(button => button.addEventListener("click", () => action(button, async () => {
  await request("/api/logout", {}); location.reload();
})));
document.querySelectorAll("[data-auth]").forEach(button => button.addEventListener("click", () => action(button, async () => {
  const data = await request("/api/microsoft/start", {kind:button.dataset.auth}); location.assign(data.url);
})));
document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => action(button, async () => {
  if (button.dataset.confirm) {
    const o = active.onboarding;
    const permissions = o.selected.join("\n");
    const details = `\n\nApp: ${o.appId}\nTenant: ${o.customerTenantId}\n${permissions}`;
    const text = button.dataset.confirm === "grant" ? "grantConfirm" : "revokeConfirm";
    if (!window.confirm(t(text) + details)) return;
  }
  let data;
  try {
    data = await request(button.dataset.action, button.dataset.confirm ? {confirm:true} : {});
  } catch (error) {
    if (error.code === "arm_login_required" && button.dataset.action === "/api/azure/discover") {
      const login = await request("/api/microsoft/start", {kind:"arm",after:"discover"});
      location.assign(login.url); return;
    }
    if (error.code !== "revocation_reauthentication_required") throw error;
    const login = await request("/api/microsoft/start", {kind:"arm",purpose:"revoke"});
    location.assign(login.url); return;
  }
  if (data.url) { location.assign(data.url); return; }
  $("result").textContent = JSON.stringify(data,null,2);
  await refresh(); message(t("done"));
})));
$("selection-form").addEventListener("submit", event => {
  event.preventDefault(); action(event.submitter, async () => {
    await request("/api/azure/selection", {subscriptions:new FormData(event.target).getAll("subscription")}, "PUT");
    await refresh(); message(t("selectionSaved"));
  });
});
$("export-connection").addEventListener("click", event => action(event.currentTarget, async () => {
  // Fetch the allowlisted export instead of serializing the session's UI state.
  const connection = await request("/api/onboarding/export", undefined, "GET");
  const url = URL.createObjectURL(new Blob([JSON.stringify(connection, null, 2)], {type:"application/json"}));
  const link = document.createElement("a");
  link.href = url; link.download = "onboarding-connection.json"; document.body.append(link);
  link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1_000);
  message(t("exportDone"));
}));
async function initialize() {
  translate();
  try {
    const config = await request("/api/config", undefined, "GET");
    partner = config.partnerName; translate();
    if (!config.emailEnabled) message(t("email_setup_pending"));
    try { await refresh(); } catch (error) {
      if (error.status !== 401) throw error;
    }
    const query = new URLSearchParams(location.search);
    const failure = query.get("auth_error");
    if (failure && /^[a-z_]{1,64}$/.test(failure)) {
      const reference = query.get("reference"), microsoftCode = query.get("microsoft_error"), resource = query.get("resource_app_id");
      message(failureMessage(failure, /^[a-f0-9-]{36}$/i.test(reference ?? "") ? reference : "",
        /^(AADSTS\d{4,10}|[a-zA-Z_]{1,80})$/.test(microsoftCode ?? "") ? microsoftCode : "",
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(resource ?? "") ? resource : ""), true);
      for (const key of ["auth_error", "reference", "microsoft_error", "resource_app_id"]) query.delete(key);
      history.replaceState(null, "", location.pathname + (query.size ? `?${query}` : "") + location.hash);
    }
  } catch (error) { message(error.message, true); }
}
initialize();

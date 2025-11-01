require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, REST, Routes } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = {};

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
            config = JSON.parse(data);
            console.log('✅ Configurações carregadas com sucesso!');
        } else {
            config = {};
            saveConfig();
            console.log('📝 Arquivo config.json criado.');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar config.json:', error);
        config = {};
    }
}

function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 4), 'utf-8');
        console.log('💾 Configurações salvas!');
    } catch (error) {
        console.error('❌ Erro ao salvar config.json:', error);
    }
}

const commands = [
    {
        name: 'setup',
        description: 'Configura o sistema de tickets (cargo de suporte e categoria)',
        options: [
            {
                name: 'cargo',
                description: 'Cargo que terá acesso aos tickets',
                type: 8,
                required: true
            },
            {
                name: 'categoria',
                description: 'Categoria onde os tickets serão criados',
                type: 7,
                required: true,
                channel_types: [ChannelType.GuildCategory]
            }
        ]
    },
    {
        name: 'ticket',
        description: 'Envia o painel de tickets no canal atual'
    },
    {
        name: 'adduser',
        description: 'Adiciona um usuário ao ticket atual',
        options: [
            {
                name: 'usuario',
                description: 'Usuário a ser adicionado ao ticket',
                type: 6,
                required: true
            }
        ]
    },
    {
        name: 'remove_user',
        description: 'Remove um usuário do ticket atual',
        options: [
            {
                name: 'usuario',
                description: 'Usuário a ser removido do ticket',
                type: 6,
                required: true
            }
        ]
    },
    {
        name: 'logs',
        description: 'Configura o canal de logs para tickets abertos e fechados',
        options: [
            {
                name: 'canal',
                description: 'Canal onde os logs serão enviados',
                type: 7,
                required: true,
                channel_types: [ChannelType.GuildText]
            }
        ]
    }
];

async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    
    try {
        console.log('🔄 Registrando comandos slash...');
        
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        
        console.log('✅ Comandos registrados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
}

client.once('clientReady', () => {
    console.log(`🤖 Bot online como ${client.user.tag}`);
    console.log(`📊 Servidores: ${client.guilds.cache.size}`);
    
    loadConfig();
    registerCommands();
    
    client.user.setActivity('tickets | /ticket', { type: 'WATCHING' });
    
    setInterval(() => {
        console.log(`⏰ [${new Date().toLocaleString('pt-BR')}] Bot ativo - ${client.guilds.cache.size} servidores`);
    }, 5 * 60 * 1000);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        
        if (interaction.commandName === 'setup') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ 
                    content: '❌ Você precisa ser um administrador para usar este comando!', 
                    ephemeral: true 
                });
            }

            const cargo = interaction.options.getRole('cargo');
            const categoria = interaction.options.getChannel('categoria');

            if (!config[interaction.guildId]) {
                config[interaction.guildId] = {};
            }

            config[interaction.guildId].supportRoleId = cargo.id;
            config[interaction.guildId].categoryId = categoria.id;
            saveConfig();

            const embed = new EmbedBuilder()
                .setTitle('✅ Configuração Concluída!')
                .setDescription(`**Sistema de tickets configurado com sucesso!**\n\n📌 **Cargo de Suporte:** ${cargo}\n📁 **Categoria:** ${categoria.name}`)
                .setColor(0x00FF00)
                .setFooter({ text: 'Powered by STG Store' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (interaction.commandName === 'ticket') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ 
                    content: '❌ Você não tem permissão para usar este comando!', 
                    ephemeral: true 
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('**Bem-vindo à Central de Atendimento!**')
                .setDescription(
                    '**Para que possamos iniciar o seu atendimento, Escolha um setor na barra de seleção abaixo e clique no botão correspondente à área desejado.**\n\n' +
                    '**H͟o͟r͟á͟r͟i͟o͟ ͟d͟e͟ ͟A͟t͟e͟n͟d͟i͟m͟e͟n͟t͟o͟:**\n\n' +
                    '> Segunda a Sexta\n8:00h as 22:30h\n\n' +
                    '> Sábado e Domingo\n7:00h as 21:30h\n\n' +
                    '> **Caso envie mensagens fora do horário de atendimento, aguarde. Assim que um staff estiver disponível, ira le atende com o setor de atendimento selecionado. Por favor, evite menções e abrir ticket atoa sem precisar de suporte.**'
                )
                .setColor(0x0099FF)
                .setFooter({ text: 'Powered by STG Store' })
                .setTimestamp();

            const button = new ButtonBuilder()
                .setCustomId('criar_ticket')
                .setLabel('criar ticket')
                .setEmoji('<:Ticket:1404555208847134780>')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(button);

            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: '✅ Painel de tickets enviado!', ephemeral: true });
        }

        if (interaction.commandName === 'logs') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ 
                    content: '❌ Você precisa ser um administrador para usar este comando!', 
                    ephemeral: true 
                });
            }

            const canal = interaction.options.getChannel('canal');

            if (!config[interaction.guildId]) {
                config[interaction.guildId] = {};
            }

            config[interaction.guildId].logsChannelId = canal.id;
            saveConfig();

            const embed = new EmbedBuilder()
                .setTitle('✅ Canal de Logs Configurado!')
                .setDescription(`**Canal de logs configurado com sucesso!**\n\n📋 **Canal de Logs:** ${canal}`)
                .setColor(0x00FF00)
                .setFooter({ text: 'Powered by STG Store' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (interaction.commandName === 'adduser') {
            const channel = interaction.channel;

            if (!channel.name.startsWith('ticket-')) {
                return interaction.reply({ 
                    content: '❌ Este comando só pode ser usado em canais de ticket!', 
                    ephemeral: true 
                });
            }

            const usuario = interaction.options.getUser('usuario');

            try {
                await channel.permissionOverwrites.create(usuario.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });

                const addEmbed = new EmbedBuilder()
                    .setTitle('✅ Usuário Adicionado')
                    .setDescription(`${usuario} foi adicionado ao ticket por ${interaction.user}.`)
                    .setColor(0x00FF00)
                    .setFooter({ text: 'Powered by STG Store' })
                    .setTimestamp();

                await interaction.reply({ embeds: [addEmbed] });
                console.log(`✅ Usuário ${usuario.tag} adicionado ao ${channel.name} por ${interaction.user.tag}`);
            } catch (error) {
                console.error('❌ Erro ao adicionar usuário:', error);
                return interaction.reply({ 
                    content: '❌ Erro ao adicionar o usuário. Verifique as permissões do bot.', 
                    ephemeral: true 
                });
            }
        }

        if (interaction.commandName === 'remove_user') {
            const channel = interaction.channel;

            if (!channel.name.startsWith('ticket-')) {
                return interaction.reply({ 
                    content: '❌ Este comando só pode ser usado em canais de ticket!', 
                    ephemeral: true 
                });
            }

            const usuario = interaction.options.getUser('usuario');

            try {
                await channel.permissionOverwrites.delete(usuario.id);

                const removeEmbed = new EmbedBuilder()
                    .setTitle('🚫 Usuário Removido')
                    .setDescription(`${usuario} foi removido do ticket por ${interaction.user}.`)
                    .setColor(0xFF6B6B)
                    .setFooter({ text: 'Powered by STG Store' })
                    .setTimestamp();

                await interaction.reply({ embeds: [removeEmbed] });
                console.log(`🚫 Usuário ${usuario.tag} removido do ${channel.name} por ${interaction.user.tag}`);
            } catch (error) {
                console.error('❌ Erro ao remover usuário:', error);
                return interaction.reply({ 
                    content: '❌ Erro ao remover o usuário. Verifique as permissões do bot.', 
                    ephemeral: true 
                });
            }
        }
    }

    if (interaction.isButton()) {
        
        if (interaction.customId === 'criar_ticket') {
            const guildConfig = config[interaction.guildId];

            if (!guildConfig || !guildConfig.supportRoleId || !guildConfig.categoryId) {
                return interaction.reply({ 
                    content: '❌ O sistema de tickets não foi configurado! Peça a um administrador para usar `/setup`.', 
                    ephemeral: true 
                });
            }

            const ticketChannelName = `ticket-${interaction.user.id}`;
            
            const existingChannel = interaction.guild.channels.cache.find(
                ch => ch.name === ticketChannelName && ch.type === ChannelType.GuildText
            );

            if (existingChannel) {
                return interaction.reply({ 
                    content: `❌ Você já tem um ticket aberto: ${existingChannel}`, 
                    ephemeral: true 
                });
            }

            await interaction.reply({ 
                content: '🎫 Criando seu ticket...', 
                ephemeral: true 
            });

            try {
                const ticketChannel = await interaction.guild.channels.create({
                    name: ticketChannelName,
                    type: ChannelType.GuildText,
                    parent: guildConfig.categoryId,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: interaction.user.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel, 
                                PermissionFlagsBits.SendMessages, 
                                PermissionFlagsBits.ReadMessageHistory
                            ]
                        },
                        {
                            id: guildConfig.supportRoleId,
                            allow: [
                                PermissionFlagsBits.ViewChannel, 
                                PermissionFlagsBits.SendMessages, 
                                PermissionFlagsBits.ReadMessageHistory
                            ]
                        }
                    ]
                });

                const ticketEmbed = new EmbedBuilder()
                    .setTitle('🎫 Ticket Aberto')
                    .setDescription(`Olá ${interaction.user}, bem-vindo ao seu ticket!\n\nUm membro da equipe de suporte irá atendê-lo em breve.\n\n**Para fechar ou reivindicar este ticket, clique nos botões abaixo.**`)
                    .setColor(0x00FF00)
                    .setFooter({ text: 'Powered by STG Store' })
                    .setTimestamp();

                const claimButton = new ButtonBuilder()
                    .setCustomId('reivindicar_ticket')
                    .setLabel('Reivindicar Ticket')
                    .setEmoji('✋')
                    .setStyle(ButtonStyle.Success);

                const closeButton = new ButtonBuilder()
                    .setCustomId('fechar_ticket')
                    .setLabel('Fechar Ticket')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder().addComponents(claimButton, closeButton);

                await ticketChannel.send({ 
                    content: `${interaction.user} | <@&${guildConfig.supportRoleId}>`,
                    embeds: [ticketEmbed], 
                    components: [row] 
                });

                console.log(`✅ Ticket criado: ${ticketChannelName} por ${interaction.user.tag}`);

                // Enviar log de ticket aberto
                if (guildConfig.logsChannelId) {
                    const logsChannel = interaction.guild.channels.cache.get(guildConfig.logsChannelId);
                    if (logsChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('📂 Ticket Aberto')
                            .setDescription(`**Usuário:** ${interaction.user} (${interaction.user.tag})\n**ID:** ${interaction.user.id}\n**Canal:** ${ticketChannel}\n**Horário:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                            .setColor(0x00FF00)
                            .setFooter({ text: 'Powered by STG Store' })
                            .setTimestamp();
                        
                        await logsChannel.send({ embeds: [logEmbed] }).catch(err => {
                            console.error('❌ Erro ao enviar log de ticket aberto:', err);
                        });
                    }
                }

            } catch (error) {
                console.error('❌ Erro ao criar ticket:', error);
                return interaction.followUp({ 
                    content: '❌ Erro ao criar o ticket. Verifique as permissões do bot.', 
                    ephemeral: true 
                });
            }
        }

        if (interaction.customId === 'reivindicar_ticket') {
            const channel = interaction.channel;

            if (!channel.name.startsWith('ticket-')) {
                return interaction.reply({ 
                    content: '❌ Este comando só pode ser usado em canais de ticket!', 
                    ephemeral: true 
                });
            }

            const guildConfig = config[interaction.guildId];
            const supportRole = interaction.guild.roles.cache.get(guildConfig.supportRoleId);

            if (!interaction.member.roles.cache.has(guildConfig.supportRoleId)) {
                return interaction.reply({ 
                    content: '❌ Apenas membros da equipe de suporte podem reivindicar tickets!', 
                    ephemeral: true 
                });
            }

            const claimEmbed = new EmbedBuilder()
                .setTitle('✋ Ticket Reivindicado')
                .setDescription(`Este ticket foi reivindicado por ${interaction.user}.\n\nEle será responsável pelo atendimento.`)
                .setColor(0xFFD700)
                .setFooter({ text: 'Powered by STG Store' })
                .setTimestamp();

            await interaction.reply({ embeds: [claimEmbed] });
            console.log(`✋ Ticket ${channel.name} reivindicado por ${interaction.user.tag}`);
        }

        if (interaction.customId === 'fechar_ticket') {
            const channel = interaction.channel;

            if (!channel.name.startsWith('ticket-')) {
                return interaction.reply({ 
                    content: '❌ Este comando só pode ser usado em canais de ticket!', 
                    ephemeral: true 
                });
            }

            const closeEmbed = new EmbedBuilder()
                .setTitle('🔒 Ticket Fechado')
                .setDescription(`Ticket fechado por ${interaction.user}.\n\nEste canal será deletado em 5 segundos...`)
                .setColor(0xFF0000)
                .setFooter({ text: 'Powered by STG Store' })
                .setTimestamp();

            await interaction.reply({ embeds: [closeEmbed] });

            console.log(`🔒 Ticket fechado: ${channel.name} por ${interaction.user.tag}`);

            // Enviar log de ticket fechado
            const guildConfig = config[interaction.guildId];
            if (guildConfig && guildConfig.logsChannelId) {
                const logsChannel = interaction.guild.channels.cache.get(guildConfig.logsChannelId);
                if (logsChannel) {
                    // Extrair o ID do usuário do nome do canal (formato: ticket-ID)
                    const userId = channel.name.replace('ticket-', '');
                    const ticketUser = await interaction.guild.members.fetch(userId).catch(() => null);
                    
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🔒 Ticket Fechado')
                        .setDescription(
                            `**Usuário do Ticket:** ${ticketUser ? `${ticketUser.user} (${ticketUser.user.tag})` : `ID: ${userId}`}\n` +
                            `**Fechado por:** ${interaction.user} (${interaction.user.tag})\n` +
                            `**Canal:** #${channel.name}\n` +
                            `**Horário:** <t:${Math.floor(Date.now() / 1000)}:F>`
                        )
                        .setColor(0xFF0000)
                        .setFooter({ text: 'Powered by STG Store' })
                        .setTimestamp();
                    
                    await logsChannel.send({ embeds: [logEmbed] }).catch(err => {
                        console.error('❌ Erro ao enviar log de ticket fechado:', err);
                    });
                }
            }

            setTimeout(() => {
                channel.delete().catch(err => {
                    console.error('❌ Erro ao deletar canal:', err);
                });
            }, 5000);
        }
    }
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Discord Ticket Bot - Status</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        background: #0d1117; 
                        color: #c9d1d9; 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        height: 100vh; 
                        margin: 0;
                    }
                    .container { 
                        text-align: center; 
                        padding: 40px; 
                        background: #161b22; 
                        border-radius: 10px; 
                        box-shadow: 0 0 20px rgba(0,0,0,0.5);
                    }
                    h1 { color: #58a6ff; }
                    .status { 
                        color: #3fb950; 
                        font-size: 24px; 
                        font-weight: bold; 
                        margin: 20px 0;
                    }
                    .info { 
                        margin: 10px 0; 
                        color: #8b949e;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🤖 Discord Ticket Bot</h1>
                    <div class="status">✅ I'm alive!</div>
                    <div class="info">Bot Status: ${client.user ? 'Online ✅' : 'Offline ❌'}</div>
                    <div class="info">Bot Name: ${client.user ? client.user.tag : 'N/A'}</div>
                    <div class="info">Servers: ${client.guilds ? client.guilds.cache.size : '0'}</div>
                    <div class="info">Uptime: ${process.uptime().toFixed(0)}s</div>
                    <p style="margin-top: 30px; color: #8b949e;">Powered by STG Store</p>
                </div>
            </body>
        </html>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Servidor HTTP rodando na porta ${PORT}`);
    console.log(`🔗 Keep-alive ativado para evitar hibernação`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️  Porta ${PORT} já está em uso. Tentando porta alternativa...`);
        const altPort = PORT + 1;
        app.listen(altPort, '0.0.0.0', () => {
            console.log(`🌐 Servidor HTTP rodando na porta ${altPort}`);
        });
    } else {
        console.error('❌ Erro no servidor HTTP:', err);
    }
});

client.login(process.env.TOKEN).catch(err => {
    console.error('❌ Erro ao fazer login no Discord:', err);
    console.error('⚠️  Verifique se o TOKEN no arquivo .env está correto!');
    process.exit(1);
});

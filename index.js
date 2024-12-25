const { Client, GatewayIntentBits, SlashCommandBuilder, ChannelType, ActivityType } = require('discord.js');
require('dotenv').config();


const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    updateBotActivity()
    
    try {
        const command = new SlashCommandBuilder()
            .setName('purge')
            .setDescription('Purge messages from a specific channel, user and more')
            .addIntegerOption(option => option
                .setName('amount')
                .setDescription('number of messages to purge')
                .setRequired(true)
            )
            .addChannelOption(option => option
                    .setName('channel')
                    .setDescription('The channel to purge messages from')
                    .setRequired(false)
                    .addChannelTypes(ChannelType.GuildText)
                )
            .addUserOption(option => option
                .setName('user')
                .setDescription("Purge messages from a user")
                .setRequired(false)
            )
            .addRoleOption(option => option
                .setName('role')
                .setDescription("Purge messages from a role")
                .setRequired(false)
            )
            .addStringOption(option =>
                option.setName('filter')
                    .setDescription('Filter for specific messages to purge (e.g., contains a word)')
                    .setRequired(false))
            .toJSON();

        await client.application.commands.create(command);
    } catch (error) {
        console.error('Error with slash command:', error);
    }
});

client.on('interactionCreate', interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'purge') {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const amount = interaction.options.getInteger('amount');
        const user = interaction.options.getUser('user');
        const filter = interaction.options.getString('filter');
        const role = interaction.options.getRole('role');
        
        if (!channel.permissionsFor(interaction.user).has('ManageMessages')) {
            return interaction.reply({ content: 'You don’t have permission to manage messages in this channel.', ephemeral: true });
        }

        channel.messages.fetch({ limit: 100 })
        .then(messages => {
            if (messages.size === 0) {
                return interaction.reply({ content: 'No messages found in this channel.', ephemeral: true });
            }
            let filteredMessages = messages;
            let errorMessage = '';

            if (user) {
                filteredMessages = filteredMessages.filter(message => message.author.id === user.id);
            }

            if (filter) {
                filteredMessages = filteredMessages.filter(message => message.content.toLowerCase().includes(filter.toLowerCase()));
            }

            if (role) {
                filteredMessages = filteredMessages.filter(message => message.member.roles.cache.has(role.id));
            }

            filteredMessages = Array.from(filteredMessages.values()).slice(0, amount);

            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            const filteredMessagesBefore = filteredMessages
            filteredMessages = filteredMessages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
            if(filteredMessages.length !== filteredMessagesBefore.length) {
                errorMessage = `However, ${filteredMessagesBefore.length - filteredMessages.length} messages couldn't be deleted because they are older than 14 days.`;
            }
            
            if (filteredMessages.length === 0) {
                return interaction.reply({ content: `No matching messages found. ${errorMessage}`, ephemeral: true });
            }

            channel.bulkDelete(filteredMessages, true)
                .then(deleted => interaction.reply({ 
                    content: `Successfully deleted ${deleted.size} messages. ${errorMessage}`, 
                    ephemeral: true 
                }))
                .catch(err => { 
                    console.error(err);
                    interaction.reply({ content: 'Failed to delete messages.', ephemeral: true });
                });
        })
        .catch(error => {
            console.error('Error fetching messages:', error);
            interaction.reply({ content: 'Failed to fetch messages. Please check my permissions.', ephemeral: true });
        });
    }
});

function updateBotActivity() {
    const activities = [
        {
            name: `with ${client.users.cache.size} users 🚀`,
            type: ActivityType.Playing,
        },
        {
            name: `${client.guilds.cache.size} servers 🗑️`,
            type: ActivityType.Listening,
        },
        {
            name: `with you, made by tudes_ 👨‍💻`,
            type: ActivityType.Playing,
        }];
        
         setInterval(() => {
            const random = Math.floor(Math.random()*activities.length);
            client.user.setActivity({name: activities[random].name, type: activities[random].type});
         }, 10000)
}

client.login(process.env.TOKEN);
